import { lookup } from "node:dns/promises";
import { NextResponse, type NextRequest } from "next/server";
import type { PropostaFolhaRosto, PropostaLinha } from "@/propostas/domain";
import { loadPropostaCompleta, updatePropostaWithRevisao } from "@/propostas/db";
import { pool } from "@/lib/db";

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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const dbHost = getDbHostname();

  if (!dbHost) {
    console.error("[api/propostas/[id]] DATABASE_URL missing or invalid (no hostname)");

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

    console.error("[api/propostas/[id]] DNS lookup failed for DB host:", dbHost, msg);

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

    await updatePropostaWithRevisao(id, body.folhaRosto, body.linhas);
    const propostaAtualizada = await loadPropostaCompleta(id);

    if (!propostaAtualizada) {
      return NextResponse.json(
        {
          error: "Proposta não encontrada após atualização",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(propostaAtualizada);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;

    console.error("[api/propostas/[id]] Failed to update proposta:", message, stack);

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}


export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'DELETE FROM proposta_linhas WHERE revisao_id IN (SELECT id FROM proposta_revisoes WHERE proposta_id = $1)',
        [id]
      );
      await client.query('DELETE FROM proposta_revisoes WHERE proposta_id = $1', [id]);
      await client.query('DELETE FROM propostas WHERE id = $1', [id]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/propostas/[id]] DELETE error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
