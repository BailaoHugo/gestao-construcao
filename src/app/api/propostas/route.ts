import { lookup } from "node:dns/promises";
import { NextResponse, type NextRequest } from "next/server";
import type { PropostaFolhaRosto, PropostaLinha } from "@/propostas/domain";
import { createPropostaWithRevisao, loadPropostasResumo } from "@/propostas/db";

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

export async function GET() {
  const dbHost = getDbHostname();

  if (!dbHost) {
    console.error("[api/propostas] DATABASE_URL missing or invalid (no hostname)");

    return NextResponse.json(
      {
        error: "Database not configured",
      },
      { status: 503 },
    );
  }

  // Mantém a verificação DNS por consistência com o POST.
  try {
    await lookup(dbHost);
  } catch (dnsErr) {
    const msg = dnsErr instanceof Error ? dnsErr.message : String(dnsErr);

    console.error("[api/propostas] DNS lookup failed for DB host:", dbHost, msg);

    return NextResponse.json(
      {
        error: "Database unreachable (DNS)",
      },
      { status: 503 },
    );
  }

  try {
    const propostas = await loadPropostasResumo();
    return NextResponse.json(propostas);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    console.error("[api/propostas] Failed to load propostas:", message);

    return NextResponse.json(
      {
        error: "Failed to load propostas",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const dbHost = getDbHostname();

  if (!dbHost) {
    console.error("[api/propostas] DATABASE_URL missing or invalid (no hostname)");

    return NextResponse.json(
      {
        error: "Database not configured",
      },
      { status: 503 },
    );
  }

  try {
    await lookup(dbHost);
  } catch (dnsErr) {
    const msg = dnsErr instanceof Error ? dnsErr.message : String(dnsErr);

    console.error("[api/propostas] DNS lookup failed for DB host:", dbHost, msg);

    return NextResponse.json(
      {
        error: "Database unreachable (DNS)",
      },
      { status: 503 },
    );
  }

  try {
    const body = (await req.json()) as {
      folhaRosto: PropostaFolhaRosto;
      linhas: PropostaLinha[];
    };

    if (!body?.folhaRosto || !Array.isArray(body?.linhas)) {
      return NextResponse.json(
        {
          error: "Invalid payload",
        },
        { status: 400 },
      );
    }

    const result = await createPropostaWithRevisao(body.folhaRosto, body.linhas);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;

    console.error("[api/propostas] Failed to save proposta:", message, stack);

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}
