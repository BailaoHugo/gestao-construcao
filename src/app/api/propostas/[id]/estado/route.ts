import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/lib/db";

const ESTADOS_VALIDOS = ["RASCUNHO", "EMITIDA", "APROVADA", "CANCELADA"] as const;
type Estado = typeof ESTADOS_VALIDOS[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propostaId } = await params;
  const body = (await req.json()) as { estado?: string };
  const estado = body.estado as Estado;

  if (!ESTADOS_VALIDOS.includes(estado)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Actualizar estado da revisão mais recente
    const revRes = await client.query<{ id: string }>(
      `SELECT id FROM proposta_revisoes
       WHERE proposta_id = $1
       ORDER BY numero_revisao DESC LIMIT 1`,
      [propostaId]
    );
    if ((revRes.rowCount ?? 0) === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });
    }
    const revisaoId = revRes.rows[0].id;

    await client.query(
      `UPDATE proposta_revisoes SET estado = $1, updated_at = now() WHERE id = $2`,
      [estado, revisaoId]
    );

    // 2. Sincronizar estado_atual na tabela propostas
    await client.query(
      `UPDATE propostas SET estado_atual = $1, updated_at = now() WHERE id = $2`,
      [estado, propostaId]
    );

    // 3. Se APROVADA e tem obra_nome mas não tem obra_id → criar obra automaticamente
    if (estado === "APROVADA") {
      const propRes = await client.query<{
        obra_id: string | null;
        obra_nome: string | null;
        obra_morada: string | null;
        cliente_nome: string;
      }>(
        `SELECT obra_id, obra_nome, obra_morada, cliente_nome FROM propostas WHERE id = $1`,
        [propostaId]
      );
      const prop = propRes.rows[0];
      if (prop && !prop.obra_id && prop.obra_nome) {
        // Gerar código sequencial para a nova obra
        const codeRes = await client.query<{ max_code: string | null }>(
          `SELECT MAX(code) AS max_code FROM obras WHERE code ~ '^[0-9]+$'`
        );
        const nextNum = (parseInt(codeRes.rows[0]?.max_code ?? "0", 10) + 1)
          .toString().padStart(3, "0");

        // Criar obra e ligar à proposta
        const obraRes = await client.query<{ id: string }>(
          `INSERT INTO obras (code, nome, descricao, estado, created_at, updated_at)
           VALUES ($1, $2, $3, 'ativo', now(), now())
           RETURNING id`,
          [nextNum, prop.obra_nome, prop.obra_morada ?? null]
        );
        const novaObraId = obraRes.rows[0].id;
        await client.query(
          `UPDATE propostas SET obra_id = $1, updated_at = now() WHERE id = $2`,
          [novaObraId, propostaId]
        );
      }
    }

    await client.query("COMMIT");
    return NextResponse.json({ ok: true, estado });
  } catch (err) {
    await client.query("ROLLBACK");
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/propostas/estado]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}
