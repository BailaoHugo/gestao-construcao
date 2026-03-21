import { notFound } from "next/navigation";
import { loadPropostaCompleta } from "@/propostas/db";
import { PropostaDetailClient } from "./PropostaDetailClient";

export const dynamic = "force-dynamic";

export default async function PropostaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proposta = await loadPropostaCompleta(id);

  if (!proposta) {
    notFound();
  }

  return <PropostaDetailClient initial={proposta} />;
}


