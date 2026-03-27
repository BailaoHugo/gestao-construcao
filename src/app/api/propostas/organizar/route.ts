import { lookup } from "node:dns/promises";
import { NextResponse, type NextRequest } from "next/server";
import { organizarOrcamentoProposta } from "@/propostas/db";

function getDbHostname(): string | null {
  const u = process.env.DATABASE_URL;
  if (!u || typeof u !== "string") return null;
  try {
    const url = new URL(u.replace(/^postgresql:\/\//i, "https://"));
    return url.hostname || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const dbHost = getDbHostname();
  if (!dbHost) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    await lookup(dbHost);
  } catch (dnsErr) {
    const msg = dnsErr instanceof Error ? dnsErr.message : String(dnsErr);
    console.error("[api/propostas/organizar] DNS lookup failed:", msg);
    return NextResponse.json({ error: "Database unreachable (DNS)" }, { status: 503 });
  }

  let body: { propostaId?: string; onlyEmpty?: boolean; preview?: boolean };
  try {
    body = (await req.json()) as {
      propostaId?: string;
      onlyEmpty?: boolean;
      preview?: boolean;
    };
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const propostaId = (body.propostaId ?? "").trim();
  if (!propostaId) {
    return NextResponse.json({ error: "propostaId é obrigatório" }, { status: 400 });
  }

  const onlyEmpty = Boolean(body.onlyEmpty);
  const preview = body.preview === true;

  try {
    const result = await organizarOrcamentoProposta(propostaId, { onlyEmpty, preview });
    return NextResponse.json({
      proposta: result.proposta,
      linhasAtualizadas: result.linhasAtualizadas,
      detalhes: result.detalhes,
      onlyEmpty,
      preview: result.preview,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/propostas/organizar] failed:", message);
    const status =
      message.includes("não encontrad") || message.includes("nao encontrad")
        ? 404
        : message.includes("Rascunho") || message.includes("rascunho")
          ? 409
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
