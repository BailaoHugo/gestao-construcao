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
    return NextResponse.json({ error: "Estado invalido" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Obter revisao mais recente
    const revRes = await client.query<{ id: string }>(
      `SELECT id FROM proposta_revisoes
       WHERE proposta_id = $1
       ORDER BY numero_revisao DESC LIMIT 1`,
      [propostaId]
    );
    if ((revRes.rowCount ?? 0) === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Proposta nao encontrada" }, { status: 404 });
    }

    // 2. Actualizar estado da revisao
    await client.query(
      `UPDATE proposta_revisoes SET estado = $1, updated_at = now() WHERE id = $2`,
      [estado, revRes.rows[0].id]
    );

    // 3. Sincronizar estado_atual na proposta
    await client.query(
      `UPDATE propostas SET estado_atual = $1, updated_at = now() WHERE id = $2`,
      [estado, propostaId]
    );

    // 4. Se APROVADA criar obra automaticamente
    if (estado === "APROVADA") {
      const propRes = await client.query<{
        obra_id: string | null;
        obra_nome: string | null;
      }>(
        `SELECT obra_id, obra_nome FROM propostas WHERE id = $1`,
        [propostaId]
      );
      const prop = propRes.rows[0];

      if (prop && !prop.obra_id && prop.obra_nome) {
        // Gerar codigo sequencial
        const codeRes = await client.query<{ max_code: string | null }>(
          `SELECT MAX(code) AS max_code FROM obras WHERE code ~ '^[0-9]+$'`
        );
        const nextCode = String(
          (parseInt(String(codeRes.rows[0]?.max_code ?? "0"), 10) + 1)
        ).padStart(3, "0");

        // INSERT usa coluna 'name' (coluna real na BD)
        const obraRes = await client.query<{ id: string }>(
          `INSERT INTO obras (code, name, estado, created_at, updated_at)
           VALUES ($1, $2, 'ativo', now(), now())
           RETURNING id`,
          [nextCode, prop.obra_nome]
        );

        // Ligar obra a proposta
        await client.query(
          `UPDATE propostas SET obra_id = $1, updated_at = now() WHERE id = $2`,
          [obraRes.rows[0].id, propostaId]
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
