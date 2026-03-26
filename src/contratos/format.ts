import type { ContratoEstado } from "./domain";

export function formatContratoEstado(estado: ContratoEstado): string {
  return estado === "EMITIDO" ? "Emitido" : "Rascunho";
}

export function formatDatePt(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const s = String(iso);
  const d = new Date(s.includes("T") ? s : s + "T00:00:00");
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("pt-PT");
}

export function formatCurrencyPt(value: number): string {
  return value.toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}
