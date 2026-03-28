import type { PropostaEstado } from "./domain";

export function formatCurrencyPt(value: number): string {
  return value.toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}

export function formatDatePt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-PT");
}

export function formatEstadoLabel(estado: PropostaEstado): string {
    if (estado === "APROVADA") return "Aprovada";
    return estado === "EMITIDA" ? "Emitida" : "Rascunho";
}

