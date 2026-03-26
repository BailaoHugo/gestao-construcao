import { notFound } from "next/navigation";
import { loadContratoCompleto } from "@/contratos/db";
import { ContratoEditor } from "@/components/contratos/ContratoEditor";

export const dynamic = "force-dynamic";

export default async function ContratoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contrato = await loadContratoCompleto(id);

  if (!contrato) {
    notFound();
  }

  return <ContratoEditor initial={contrato} />;
}
