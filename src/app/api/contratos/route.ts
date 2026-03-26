import { NextResponse, type NextRequest } from "next/server";
import { loadContratosResumo, createContrato } from "@/contratos/db";

export async function GET() {
  try {
    const contratos = await loadContratosResumo();
    return NextResponse.json(contratos);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/contratos] Failed to load contratos:", message);
    return NextResponse.json({ error: "Failed to load contratos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { propostaId?: string; revisaoId?: string };

    if (!body?.propostaId || !body?.revisaoId) {
      return NextResponse.json({ error: "propostaId e revisaoId são obrigatórios" }, { status: 400 });
    }

    const result = await createContrato(body.propostaId, body.revisaoId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[api/contratos] Failed to create contrato:", message, stack);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
