export type ParsedImportedLine = {
  rawLine: string;
  descricao: string;
  unidade: string | null;
  quantidade: number | null;
  preco_venda_unitario: number | null;
  total_venda_linha: number | null;
  preco_custo_unitario: number | null;
  total_custo_linha: number | null;
  capitulo: string | null;
  isValid: boolean;
  error: string | null;
};

function normalizeNumber(value: string): number | null {
  const cleaned = value.replace(/\s+/g, "").replace(/€/g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function parseImportedLines(rawText: string): ParsedImportedLine[] {
  const lines = rawText.split(/\r?\n/);
  const result: ParsedImportedLine[] = [];

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) {
      continue;
    }

    let parts: string[] | null = null;
    if (trimmed.includes("\t")) {
      parts = trimmed.split("\t").map((p) => p.trim());
    } else if (trimmed.includes("|")) {
      parts = trimmed.split("|").map((p) => p.trim());
    } else if (trimmed.includes(";")) {
      parts = trimmed.split(";").map((p) => p.trim());
    } else if (/\s{2,}/.test(trimmed)) {
      // Fallback: 2 ou mais espaços consecutivos entre colunas
      parts = trimmed.split(/\s{2,}/).map((p) => p.trim());
    }

    if (!parts) {
      result.push({
        rawLine: raw,
        descricao: "",
        unidade: null,
        quantidade: null,
        preco_venda_unitario: null,
        total_venda_linha: null,
        preco_custo_unitario: null,
        total_custo_linha: null,
        capitulo: null,
        isValid: false,
        error:
          "Não foi possível identificar 8 colunas válidas. Usa TAB, |, ; ou garante separação clara entre colunas.",
      });
      continue;
    }

    if (parts.length !== 8) {
      result.push({
        rawLine: raw,
        descricao: "",
        unidade: null,
        quantidade: null,
        preco_venda_unitario: null,
        total_venda_linha: null,
        preco_custo_unitario: null,
        total_custo_linha: null,
        capitulo: null,
        isValid: false,
        error:
          "Esperadas 8 colunas: Capítulo | Descrição | Unidade | Quantidade | PU Venda | Total Venda | PU Custo | Total Custo",
      });
      continue;
    }

    // 8 colunas obrigatórias:
    // Capítulo | Descrição | Unidade | Quantidade | PU Venda | Total Venda | PU Custo | Total Custo
    const [
      capituloRaw,
      descricaoRaw,
      unidadeRaw,
      quantidadeRaw,
      puVendaRaw,
      _totalVendaIgnorado,
      puCustoRaw,
      _totalCustoIgnorado,
    ] = parts;

    if (!descricaoRaw) {
      result.push({
        rawLine: raw,
        descricao: "",
        unidade: unidadeRaw || null,
        quantidade: null,
        preco_venda_unitario: null,
        total_venda_linha: null,
        preco_custo_unitario: null,
        total_custo_linha: null,
        capitulo: capituloRaw || null,
        isValid: false,
        error: "Descrição obrigatória",
      });
      continue;
    }

    const quantidade = normalizeNumber(quantidadeRaw);
    if (quantidade === null) {
      result.push({
        rawLine: raw,
        descricao: descricaoRaw,
        unidade: unidadeRaw || null,
        quantidade: null,
        preco_venda_unitario: null,
        total_venda_linha: null,
        preco_custo_unitario: null,
        total_custo_linha: null,
        capitulo: capituloRaw || null,
        isValid: false,
        error: "Quantidade inválida",
      });
      continue;
    }

    const puVenda = normalizeNumber(puVendaRaw);
    if (puVenda === null) {
      result.push({
        rawLine: raw,
        descricao: descricaoRaw,
        unidade: unidadeRaw || null,
        quantidade,
        preco_venda_unitario: null,
        total_venda_linha: null,
        preco_custo_unitario: null,
        total_custo_linha: null,
        capitulo: capituloRaw || null,
        isValid: false,
        error: "PU inválido",
      });
      continue;
    }

    const puCusto = normalizeNumber(puCustoRaw);
    if (puCusto === null) {
      result.push({
        rawLine: raw,
        descricao: descricaoRaw,
        unidade: unidadeRaw || null,
        quantidade,
        preco_venda_unitario: puVenda,
        total_venda_linha: null,
        preco_custo_unitario: null,
        total_custo_linha: null,
        capitulo: capituloRaw || null,
        isValid: false,
        error: "PU custo inválido",
      });
      continue;
    }

    const totalVenda = quantidade * puVenda;
    const totalCusto = quantidade * puCusto;

    result.push({
      rawLine: raw,
      descricao: descricaoRaw,
      unidade: unidadeRaw || null,
      quantidade,
      preco_venda_unitario: puVenda,
      total_venda_linha: totalVenda,
      preco_custo_unitario: puCusto,
      total_custo_linha: totalCusto,
      capitulo: capituloRaw || null,
      isValid: true,
      error: null,
    });
  }

  return result;
}

