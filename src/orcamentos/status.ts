import type { BudgetStatus } from "@/orcamentos/domain";

export const BUDGET_STATUS_LABEL: Record<BudgetStatus, string> = {
  EM_EXECUCAO: "Em execução",
  EM_ANALISE: "Em análise",
  APROVADO: "Aprovado",
};

export const BUDGET_STATUS_CLASSES: Record<BudgetStatus, string> = {
  EM_EXECUCAO:
    "bg-blue-50 text-blue-700 border-blue-200",
  EM_ANALISE:
    "bg-amber-50 text-amber-700 border-amber-200",
  APROVADO:
    "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const PILL_BASE =
  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium";

const VALID_STATUSES: BudgetStatus[] = ["EM_EXECUCAO", "EM_ANALISE", "APROVADO"];

function isBudgetStatus(value: string | undefined): value is BudgetStatus {
  return typeof value === "string" && VALID_STATUSES.includes(value as BudgetStatus);
}

/** Label for display; use "—" for unknown status. */
export function getStatusLabel(status: string | undefined): string {
  if (isBudgetStatus(status)) {
    return BUDGET_STATUS_LABEL[status];
  }
  return "—";
}

/** Tailwind classes for the status pill; neutral gray for unknown. */
export function getStatusClasses(status: string | undefined): string {
  if (isBudgetStatus(status)) {
    return `${PILL_BASE} ${BUDGET_STATUS_CLASSES[status]}`;
  }
  return `${PILL_BASE} bg-slate-100 text-slate-600 border-slate-200`;
}
