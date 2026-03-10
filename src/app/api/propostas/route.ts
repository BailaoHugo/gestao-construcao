import { lookup } from "node:dns/promises";
import { NextResponse, type NextRequest } from "next/server";
import type { PropostaFolhaRosto, PropostaLinha } from "@/propostas/domain";
import { createPropostaWithRevisao } from "@/propostas/db";

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
    console.error("[api/propostas] DATABASE_URL missing or invalid (no hostname)");
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 },
    );
  }
  try {
    await lookup(dbHost);
  } catch (dnsErr) {
    const msg = dnsErr instanceof Error ? dnsErr.message : String(dnsErr);
    console.error("[api/propostas] DNS lookup failed for DB host:", dbHost, msg);
    return NextResponse.json(
      { error: "Database unreachable (DNS)" },
      { status: 503 },
    );
  }

  try {
    const body = (await req.json()) as {
      folhaRosto: PropostaFolhaRosto;
      linhas: PropostaLinha[];
    };

    const { folhaRosto, linhas } = body;

    if (!folhaRosto || typeof folhaRosto.clienteNome !== "string") {
      return NextResponse.json(
        { error: "clienteNome é obrigatório" },
        { status: 400 },
      );
    }

    if (!Array.isArray(linhas) || linhas.length === 0) {
      return NextResponse.json(
        { error: "Deve adicionar pelo menos uma linha" },
        { status: 400 },
      );
    }

    const linhasValidas = linhas.filter(
      (l) => l.descricao && Number(l.quantidade) > 0,
    );

    if (linhasValidas.length === 0) {
      return NextResponse.json(
        { error: "Todas as linhas estão vazias ou com quantidade 0" },
        { status: 400 },
      );
    }

    const { id } = await createPropostaWithRevisao(folhaRosto, linhasValidas);

    return NextResponse.json({ id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[api/propostas] Failed to save proposta:", message, stack);
    return NextResponse.json(
      { error: "Falha ao gravar proposta: " + message },
      { status: 500 },
    );
  }
}

