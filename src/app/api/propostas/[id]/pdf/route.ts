import { loadPropostaCompleta } from "@/propostas/db";
import { renderPropostaPdf } from "@/lib/propostas/pdf";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const revisaoId = searchParams.get("revisaoId");

  let proposta;
  try {
    proposta = await loadPropostaCompleta(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/propostas/[id]/pdf] DB error:", message);
    return new Response(JSON.stringify({ error: "Erro de base de dados" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!proposta) {
    return new Response(JSON.stringify({ error: "Proposta não encontrada" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const revisao = revisaoId
    ? proposta.todasRevisoes.find((r) => r.id === revisaoId)
    : proposta.revisaoAtual;

  if (!revisao) {
    return new Response(JSON.stringify({ error: "Revisão não encontrada" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  let buffer: Buffer;
  try {
    buffer = await renderPropostaPdf(proposta, revisao);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[api/propostas/[id]/pdf] PDF render error:", message);
    console.error("[api/propostas/[id]/pdf] Stack:", stack);
    return new Response(JSON.stringify({ error: "Falha ao gerar PDF", detail: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const filename = `proposta-${proposta.codigo}-R${revisao.numeroRevisao}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
