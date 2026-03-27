/**
 * Importador estruturado: apenas tabelas com cabeçalhos reconhecíveis (TAB, ; ou |).
 * Sem interpretação de PDF livre nem descrições multilinha fora deste formato.
 */

import { K_DEFAULT } from "@/lib/propostas/linhaDerivados";

export type ImportLinhaEstado = "ok" | "aviso" | "erro";

/** Papel semântico de cada coluna importada. */
export type ImportColumnRole =
  | "ignore"
  | "descricao"
  | "unidade"
  | "quantidade"
  | "puCusto"
  | "totalCusto"
  | "puVenda"
  | "totalVenda";

export const IMPORT_COLUMN_ROLE_OPTIONS: {
  value: ImportColumnRole;
  label: string;
}[] = [
  { value: "ignore", label: "Ignorar coluna" },
  { value: "descricao", label: "LISTAGEM DE TRABALHOS" },
  { value: "unidade", label: "UN." },
  { value: "quantidade", label: "QTD." },
  { value: "puCusto", label: "UNITÁRIO CUSTO" },
  { value: "totalCusto", label: "TOTAL CUSTO" },
  { value: "puVenda", label: "UNITÁRIO VENDA" },
  { value: "totalVenda", label: "TOTAL VENDA" },
];

export type ImportLinhaDraft = {
  id: string;
  rawLine: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  precoCustoUnitario: number | null;
  totalCustoLinha: number | null;
  precoVendaUnitario: number | null;
  totalVendaLinha: number | null;
  /** Avisos de coerência (ex.: total ≠ qtd × unitário). */
  avisos: string[];
};

export type Delimiter = "\t" | ";" | "|";

export type ParseImportTableResult =
  | {
      ok: true;
      delimiter: Delimiter;
      headerRowIndex: number;
      rawHeaderCells: string[];
      dataRows: string[][];
    }
  | { ok: false; error: string };

const COH_EPS = 0.02;

export function normalizeImportNumber(value: string): number | null {
  const cleaned = value.replace(/\s+/g, "").replace(/€/g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return n;
}

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `imp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Cabeçalho normalizado para comparação (sem acentos, maiúsculas, espaços colapsados). */
export function normalizeHeaderForMatch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.+$/u, "");
}

/**
 * Infere o papel de uma célula de cabeçalho a partir de sinónimos.
 * Ordem: padrões mais específicos primeiro.
 */
export function inferColumnRoleFromHeader(cell: string): ImportColumnRole | null {
  const h = normalizeHeaderForMatch(cell);
  if (!h) return null;

  if (h.includes("UNITARIO") && h.includes("CUSTO")) return "puCusto";
  if (h.includes("PU") && h.includes("CUSTO")) return "puCusto";
  if (h === "PU CUSTO") return "puCusto";

  if (h.includes("UNITARIO") && h.includes("VENDA")) return "puVenda";
  if (h.includes("PU") && h.includes("VENDA")) return "puVenda";
  if (h === "PU VENDA") return "puVenda";

  if (h.includes("TOTAL") && h.includes("CUSTO") && !h.includes("UNITARIO")) {
    return "totalCusto";
  }
  if (h === "TOTAL CUSTO") return "totalCusto";

  if (h.includes("TOTAL") && h.includes("VENDA") && !h.includes("UNITARIO")) {
    return "totalVenda";
  }
  if (h === "TOTAL VENDA") return "totalVenda";

  if (h.includes("LISTAGEM") && h.includes("TRABALHOS")) return "descricao";
  if (h.startsWith("DESCRI")) return "descricao";
  if (h === "DESCRICAO" || h === "DESCRICOES") return "descricao";

  if (h === "UN" || h === "UN." || h === "UNIDADE") return "unidade";

  if (
    h === "QTD" ||
    h === "QTD." ||
    h.startsWith("QTD ") ||
    h === "QUANTIDADE"
  ) {
    return "quantidade";
  }

  return null;
}

/** Gera mapeamento inicial: colunas não reconhecidas → ignore; duplicados → ignore. */
export function suggestColumnMapping(rawHeaderCells: string[]): ImportColumnRole[] {
  const seen = new Set<ImportColumnRole>();
  const out: ImportColumnRole[] = [];
  for (const cell of rawHeaderCells) {
    let r = inferColumnRoleFromHeader(cell) ?? "ignore";
    if (r !== "ignore" && seen.has(r)) {
      r = "ignore";
    }
    if (r !== "ignore") seen.add(r);
    out.push(r);
  }
  return out;
}

function detectDelimiter(line: string): Delimiter {
  const t = (line.match(/\t/g) ?? []).length;
  const sc = (line.match(/;/g) ?? []).length;
  const pi = (line.match(/\|/g) ?? []).length;
  if (t >= sc && t >= pi && t > 0) return "\t";
  if (sc >= pi && sc > 0) return ";";
  return "|";
}

function splitRow(line: string, delim: Delimiter): string[] {
  if (delim === "\t") return line.split("\t").map((c) => c.trim());
  if (delim === ";") return line.split(";").map((c) => c.trim());
  return line.split("|").map((c) => c.trim());
}

function countRecognizedHeaderCells(cells: string[]): number {
  return cells.filter((c) => inferColumnRoleFromHeader(c) !== null).length;
}

/**
 * Localiza a linha de cabeçalho e extrai dados. Só formatos tabulares.
 */
export function parseImportTable(rawText: string): ParseImportTableResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      ok: false,
      error:
        "São necessárias pelo menos duas linhas (cabeçalho e uma linha de dados).",
    };
  }

  let bestIdx = -1;
  let bestScore = 0;
  let bestCells: string[] = [];

  const scanLimit = Math.min(lines.length, 15);
  for (let i = 0; i < scanLimit; i++) {
    const d = detectDelimiter(lines[i]!);
    const cells = splitRow(lines[i]!, d);
    if (cells.length < 3) continue;
    const score = countRecognizedHeaderCells(cells);
    if (score >= 2 && score > bestScore) {
      bestScore = score;
      bestIdx = i;
      bestCells = cells;
    }
  }

  if (bestIdx < 0) {
    return {
      ok: false,
      error:
        "Não foi encontrado um cabeçalho reconhecível. Use colunas como LISTAGEM DE TRABALHOS (ou DESCRIÇÃO), UN., QTD., UNITÁRIO CUSTO / VENDA, etc.",
    };
  }

  const headerDelim = detectDelimiter(lines[bestIdx]!);
  const dataRows: string[][] = [];
  for (let i = bestIdx + 1; i < lines.length; i++) {
    const row = splitRow(lines[i]!, headerDelim);
    if (row.every((c) => !c.trim())) continue;
    const padded = [...row];
    while (padded.length < bestCells.length) padded.push("");
    dataRows.push(padded.slice(0, bestCells.length));
  }

  if (dataRows.length === 0) {
    return {
      ok: false,
      error: "Não há linhas de dados depois do cabeçalho.",
    };
  }

  return {
    ok: true,
    delimiter: headerDelim,
    headerRowIndex: bestIdx,
    rawHeaderCells: bestCells,
    dataRows,
  };
}

function pickCell(
  cells: string[],
  mapping: ImportColumnRole[],
  role: ImportColumnRole,
): string {
  const idx = mapping.indexOf(role);
  if (idx < 0) return "";
  return (cells[idx] ?? "").trim();
}

function parseNum(s: string): number | null {
  if (!s.trim()) return null;
  return normalizeImportNumber(s);
}

/**
 * Constrói linhas de preview a partir da tabela e do mapeamento de colunas.
 */
export function buildImportDrafts(
  table: Extract<ParseImportTableResult, { ok: true }>,
  columnMapping: ImportColumnRole[],
): ImportLinhaDraft[] {
  const n = table.rawHeaderCells.length;
  const map =
    columnMapping.length === n
      ? columnMapping
      : columnMapping.slice(0, n).concat(
          Array.from({ length: Math.max(0, n - columnMapping.length) }, () =>
            "ignore",
          ),
        );

  const out: ImportLinhaDraft[] = [];

  for (const cells of table.dataRows) {
    const padded = [...cells];
    while (padded.length < n) padded.push("");
    const rowCells = padded.slice(0, n);

    const descricao = pickCell(rowCells, map, "descricao");
    const unidade = pickCell(rowCells, map, "unidade");
    const qRaw = pickCell(rowCells, map, "quantidade");
    const quantidade = parseNum(qRaw);

    let puC = parseNum(pickCell(rowCells, map, "puCusto"));
    let totC = parseNum(pickCell(rowCells, map, "totalCusto"));
    let puV = parseNum(pickCell(rowCells, map, "puVenda"));
    let totV = parseNum(pickCell(rowCells, map, "totalVenda"));

    const avisos: string[] = [];

    const q =
      quantidade !== null && quantidade > 0 ? quantidade : Number.NaN;

    if (Number.isFinite(q)) {
      if (puC != null && totC != null) {
        const esperado = q * puC;
        if (Math.abs(esperado - totC) > COH_EPS) {
          avisos.push("Total custo não coincide com Qtd × Unitário custo.");
        }
      }
      if (puV != null && totV != null) {
        const esperado = q * puV;
        if (Math.abs(esperado - totV) > COH_EPS) {
          avisos.push("Total venda não coincide com Qtd × Unitário venda.");
        }
      }
    }

    if (Number.isFinite(q)) {
      if (puC != null && totC == null) totC = q * puC;
      if (puC == null && totC != null) puC = totC / q;
      if (puV != null && totV == null) totV = q * puV;
      if (puV == null && totV != null) puV = totV / q;
    }

    const hasCustoSide =
      (puC != null && puC >= 0) || (totC != null && totC >= 0);
    const hasVendaSide =
      (puV != null && puV >= 0) || (totV != null && totV >= 0);

    if (Number.isFinite(q)) {
      if (!hasCustoSide && hasVendaSide) {
        if (puV != null) {
          puC = puV / K_DEFAULT;
          totC = q * puC;
        } else if (totV != null) {
          puV = totV / q;
          puC = puV / K_DEFAULT;
          totC = q * puC;
        }
      } else if (!hasVendaSide && hasCustoSide) {
        if (puC != null) {
          puV = puC * K_DEFAULT;
          totV = q * puV;
        } else if (totC != null) {
          puC = totC / q;
          puV = puC * K_DEFAULT;
          totV = q * puV;
        }
      }
    }

    const rawLine = rowCells.join(
      table.delimiter === "\t" ? "\t" : table.delimiter === ";" ? ";" : "|",
    );

    out.push({
      id: newId(),
      rawLine,
      descricao,
      unidade,
      quantidade: Number.isFinite(q) ? q : 0,
      precoCustoUnitario: puC,
      totalCustoLinha: totC,
      precoVendaUnitario: puV,
      totalVendaLinha: totV,
      avisos,
    });
  }

  return out;
}

/**
 * @deprecated Usar `parseImportTable` + `buildImportDrafts`. Mantido para chamadas simples.
 */
export function parseImportedLines(rawText: string): ImportLinhaDraft[] {
  const t = parseImportTable(rawText);
  if (!t.ok) return [];
  return buildImportDrafts(t, suggestColumnMapping(t.rawHeaderCells));
}

export function validateImportLinhaErrors(d: ImportLinhaDraft): string[] {
  const e: string[] = [];
  if (!d.descricao.trim()) e.push("LISTAGEM DE TRABALHOS (descrição) obrigatória.");
  if (!d.unidade.trim()) e.push("UN. (unidade) obrigatória.");
  if (!Number.isFinite(d.quantidade) || d.quantidade <= 0) {
    e.push("QTD. deve ser maior que zero.");
  }
  const hasPuC = d.precoCustoUnitario != null && d.precoCustoUnitario >= 0;
  const hasPuV = d.precoVendaUnitario != null && d.precoVendaUnitario >= 0;
  if (!hasPuC && !hasPuV) {
    e.push("Indique pelo menos Unitário custo ou Unitário venda (ou totais).");
  }
  return e;
}

export function getImportLinhaEstado(d: ImportLinhaDraft): ImportLinhaEstado {
  const errs = validateImportLinhaErrors(d);
  if (errs.length > 0) return "erro";
  if (d.avisos.length > 0) return "aviso";
  return "ok";
}

export function todasLinhasImportValidas(rows: ImportLinhaDraft[]): boolean {
  if (rows.length === 0) return false;
  return rows.every((r) => getImportLinhaEstado(r) !== "erro");
}
