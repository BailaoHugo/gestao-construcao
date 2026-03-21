/**
 * Colunas opcionais do resumo por capítulo (a coluna «Capítulo» é sempre visível).
 */

export const RESUMO_CAP_COLUNAS_ORDER = [
  "custo",
  "venda",
  "margem",
  "margemPct",
] as const;

export type ResumoCapColunaKey = (typeof RESUMO_CAP_COLUNAS_ORDER)[number];

export const RESUMO_CAP_COL_LABELS: Record<ResumoCapColunaKey, string> = {
  custo: "Custo",
  venda: "Venda",
  margem: "Margem",
  margemPct: "Margem %",
};

export const STORAGE_KEY_RESUMO_CAP_COLUNAS =
  "propostas.resumoCapitulos.colunas.v1";

export function defaultResumoCapColunas(): Record<
  ResumoCapColunaKey,
  boolean
> {
  return {
    custo: true,
    venda: true,
    margem: true,
    margemPct: true,
  };
}

export function loadResumoCapColunas(): Record<ResumoCapColunaKey, boolean> {
  const defaults = defaultResumoCapColunas();
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RESUMO_CAP_COLUNAS);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const k of RESUMO_CAP_COLUNAS_ORDER) {
      if (typeof parsed[k] === "boolean") {
        defaults[k] = parsed[k];
      }
    }
    /* Garantir pelo menos uma coluna numérica visível */
    if (countResumoCapColunasVisiveis(defaults) < 1) {
      return defaultResumoCapColunas();
    }
    return defaults;
  } catch {
    return defaultResumoCapColunas();
  }
}

export function saveResumoCapColunas(
  v: Record<ResumoCapColunaKey, boolean>,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_RESUMO_CAP_COLUNAS, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

export function countResumoCapColunasVisiveis(
  v: Record<ResumoCapColunaKey, boolean>,
): number {
  return RESUMO_CAP_COLUNAS_ORDER.filter((k) => v[k]).length;
}
