import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/lib/db";

const ESTADOS_VALIDOS = ["RASCUNHO", "EMITIDA", "APROVADA", "CANCELADA"] as const;
type Estado = (typeof ESTADOS_VALIDOS)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
      `SELECT id FROM proposta_revisoes WHERE proposta_id = $1 ORDER BY numero_revisao DESC LIMIT 1`,
      [propostaId],
    );
    if ((revRes.rowCount ?? 0) === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Proposta nao encontrada" },
        { status: 404 },
      );
    }

    // 2. Actualizar estado da revisao
    await client.query(
      `UPDATE proposta_revisoes SET estado = $1, updated_at = now() WHERE id = $2`,
      [estado, revRes.rows[0].id],
    );

    // 3. Sincronizar estado_atual na proposta
    await client.query(
      `UPDATE propostas SET estado_atual = $1, updated_at = now() WHERE id = $2`,
      [estado, propostaId],
    );

    // 4. Obter dados da proposta (obra_id, morada, nipc)
    const propRes = await client.query<{
      obra_id: string | null;
      obra_nome: string | null;
      obra_morada: string | null;
      cliente_nome: string | null;
      cliente_nipc: string | null;
    }>(
      `SELECT obra_id, obra_nome, obra_morada, cliente_nome, cliente_nipc FROM propostas WHERE id = $1`,
      [propostaId],
    );
    const prop = propRes.rows[0];

    // 5. Se EMITIDA e ja tem obra_id: propagar morada + nipc para a obra
    if (estado === "EMITIDA" && prop?.obra_id) {
      await client.query(
        `UPDATE obras SET morada = $1, nipc = $2, updated_at = now() WHERE id = $3`,
        [prop.obra_morada ?? null, prop.cliente_nipc ?? null, prop.obra_id],
      );
    }

    // 6. Se APROVADA criar obra automaticamente (apenas se ainda nao tem obra_id)
    if (estado === "APROVADA") {
      if (prop && !prop.obra_id && prop.obra_nome) {
        // Gerar codigo sequencial YY.NNN (ex: 26.001)
        const year = new Date().getFullYear().toString().slice(-2);
        let nextCode = `${year}.001`;
        for (let attempt = 0; attempt < 10; attempt++) {
          const codeRes = await client.query<{ max_seq: number | null }>(
            `SELECT COALESCE(MAX(SUBSTRING(code FROM '[0-9]+$')::integer), 0) AS max_seq
             FROM obras WHERE code ~ $1`,
            [`^${year}\\.[0-9]+$`],
          );
          const maxSeq = (codeRes.rows[0]?.max_seq as number | null) ?? 0;
          nextCode = `${year}.${String(maxSeq + 1 + attempt).padStart(3, "0")}`;
          const existsRes = await client.query<{ exists: boolean }>(
            `SELECT EXISTS(SELECT 1 FROM obras WHERE code = $1) AS exists`,
            [nextCode],
          );
          if (!existsRes.rows[0].exists) break;
        }

        // INSERT obra com morada e nipc
        const obraRes = await client.query<{ id: string }>(
          `INSERT INTO obras (code, name, descricao, estado, morada, nipc, created_at, updated_at)
           VALUES ($1, $2, $3, 'ativo', $4, $5, now(), now())
           ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, updated_at = now()
           RETURNING id`,
          [nextCode, prop.obra_nome, prop.obra_morada ?? null, prop.obra_morada ?? null, prop.cliente_nipc ?? null],
        );

        // Ligar obra a proposta
        await client.query(
          `UPDATE propostas SET obra_id = $1, updated_at = now() WHERE id = $2`,
          [obraRes.rows[0].id, propostaId],
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
