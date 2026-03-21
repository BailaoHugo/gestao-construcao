export const COLUNAS_LINHA_ORDER = [
  "descricao",
  "codigo",
  "qtd",
  "unidade",
  "grandeCap",
  "capitulo",
  "k",
  "puCusto",
  "totalCusto",
  "puVenda",
  "totalVenda",
  "margem",
] as const;

export type ColunaLinhaKey = (typeof COLUNAS_LINHA_ORDER)[number];

export const COLUNA_LABELS: Record<ColunaLinhaKey, string> = {
  descricao: "Descrição",
  codigo: "Cód.",
  qtd: "Qtd.",
  unidade: "Unid.",
  grandeCap: "Grande Cap.",
  capitulo: "Cap.",
  k: "K",
  puCusto: "PU Custo",
  totalCusto: "Total Custo",
  puVenda: "PU Venda",
  totalVenda: "Total Venda",
  margem: "Margem",
};

/** Colunas que não podem ser ocultadas (mínimo útil na grelha) */
export const COLUNAS_OBRIGATORIAS: ReadonlySet<ColunaLinhaKey> = new Set([
  "descricao",
]);

/** v2: por defeito só Descrição, Qtd. e Unid. */
export const STORAGE_KEY_COLUNAS_LINHAS =
  "propostas.linhasEditor.colunas.v2";

const DEFAULT_ON: ReadonlySet<ColunaLinhaKey> = new Set([
  "descricao",
  "qtd",
  "unidade",
]);

export function defaultColunasVisiveis(): Record<ColunaLinhaKey, boolean> {
  return Object.fromEntries(
    COLUNAS_LINHA_ORDER.map((k) => [k, DEFAULT_ON.has(k)]),
  ) as Record<ColunaLinhaKey, boolean>;
}

export function loadColunasVisiveis(): Record<ColunaLinhaKey, boolean> {
  const defaults = defaultColunasVisiveis();
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COLUNAS_LINHAS);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const k of COLUNAS_LINHA_ORDER) {
      if (typeof parsed[k] === "boolean") {
        defaults[k] = parsed[k];
      }
    }
    for (const k of COLUNAS_OBRIGATORIAS) {
      defaults[k] = true;
    }
    return defaults;
  } catch {
    return defaultColunasVisiveis();
  }
}

export function saveColunasVisiveis(
  v: Record<ColunaLinhaKey, boolean>,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_COLUNAS_LINHAS, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

export function countColunasVisiveis(
  v: Record<ColunaLinhaKey, boolean>,
): number {
  return COLUNAS_LINHA_ORDER.filter((k) => v[k]).length;
}
