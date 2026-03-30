import { NextResponse, type NextRequest } from "next/server";
import { loadContratoCompleto, updateContrato } from "@/contratos/db";
import type { ContratoEstado, ClausulaContrato } from "@/contratos/domain";
import { pool } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const contrato = await loadContratoCompleto(id);
    if (!contrato) {
      return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });
    }
    return NextResponse.json(contrato);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/contratos/[id]] GET error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const body = (await req.json()) as {
      dataContrato?: string | null;
      dataConclusaoPrevista?: string | null;
      signatarioDonoNome?: string;
      signatarioDonoFuncao?: string;
      signatarioEmpreiteiroNome?: string;
      signatarioEmpreiteiroFuncao?: string;
      clausulas?: ClausulaContrato[];
    };

    await updateContrato(id, {
      dataContrato: body.dataContrato,
      dataConclusaoPrevista: body.dataConclusaoPrevista,
      signatarioDonoNome: body.signatarioDonoNome,
      signatarioDonoFuncao: body.signatarioDonoFuncao,
      signatarioEmpreiteiroNome: body.signatarioEmpreiteiroNome,
      signatarioEmpreiteiroFuncao: body.signatarioEmpreiteiroFuncao,
      clausulas: body.clausulas,
    });

    const updated = await loadContratoCompleto(id);
    if (!updated) {
      return NextResponse.json({ error: "Contrato não encontrado após atualização" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[api/contratos/[id]] PUT error:", message, stack);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const body = (await req.json()) as { estado?: ContratoEstado };

    if (!body?.estado) {
      return NextResponse.json({ error: "estado é obrigatório" }, { status: 400 });
    }

    await updateContrato(id, { estado: body.estado });

    const updated = await loadContratoCompleto(id);
    if (!updated) {
      return NextResponse.json({ error: "Contrato não encontrado após atualização" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/contratos/[id]] PATCH error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM contrato_avancos WHERE contrato_id = $1', [id]);
      await client.query('DELETE FROM contrato_custos WHERE contrato_id = $1', [id]);
      await client.query('DELETE FROM contratos WHERE id = $1', [id]);
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
    console.error('[api/contratos/[id]] DELETE error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
