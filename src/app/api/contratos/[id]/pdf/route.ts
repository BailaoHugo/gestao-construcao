import { loadContratoCompleto } from "@/contratos/db";
import { renderContratoPdf } from "@/lib/contratos/pdf";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let contrato;
  try {
    contrato = await loadContratoCompleto(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/contratos/[id]/pdf] DB error:", message);
    return new Response(JSON.stringify({ error: "Erro de base de dados" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!contrato) {
    return new Response(JSON.stringify({ error: "Contrato não encontrado" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  let buffer: Buffer;
  try {
    buffer = await renderContratoPdf(contrato);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[api/contratos/[id]/pdf] PDF render error:", message);
    console.error("[api/contratos/[id]/pdf] Stack:", stack);
    return new Response(
      JSON.stringify({ error: "Falha ao gerar PDF", detail: message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const filename = `contrato-${contrato.propostaCodigo}-R${contrato.revisaoNumero}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
