import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// GET /api/ponto?mes=YYYY-MM
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const today = new Date();
    const mes = searchParams.get('mes') ?? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const [yearStr, monthStr] = mes.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const dataInicio = `${mes}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const dataFim = `${mes}-${String(lastDay).padStart(2, '0')}`;
    const [trabRows, regRows, obraRows] = await Promise.all([
      pool.query(
        `SELECT id, nome, cargo, custo_hora AS "custoHora", ativo FROM trabalhadores WHERE ativo = true ORDER BY nome`
      ),
      pool.query(
        `SELECT rp.id, rp.trabalhador_id AS "trabalhadorId", rp.obra_id AS "obraId",
                rp.data::text AS data, rp.horas::float AS horas, rp.custo::float AS custo,
                rp.notas, t.nome AS "trabalhadorNome", o.name AS "obraNome", o.code AS "obraCode"
         FROM registos_ponto rp
         JOIN trabalhadores t ON t.id = rp.trabalhador_id
         LEFT JOIN obras o ON o.id = rp.obra_id
         WHERE rp.data >= $1 AND rp.data <= $2
         ORDER BY rp.data, t.nome, rp.criado_em`,
        [dataInicio, dataFim]
      ),
      pool.query(
        `SELECT id, code, name AS nome FROM obras WHERE estado = 'ativo' ORDER BY code`
      ),
    ]);
    return NextResponse.json({
      trabalhadores: trabRows.rows,
      registos: regRows.rows,
      obras: obraRows.rows,
      mes, dataInicio, dataFim,
    });
  } catch (err) {
    console.error('GET /api/ponto:', err);
    return NextResponse.json({ error: 'Erro ao carregar mapa de ponto' }, { status: 500 });
  }
}

// POST /api/ponto
// Modes:
//   { bulk: [...], clearDates: [...] }  — bulk replace (clear dates then insert)
//   { id, obraId, horas, notas }        — update existing record by id
//   { trabalhadorId, obraId, data, horas, notas } — insert single record
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Bulk replace mode
    if (body.bulk !== undefined) {
      const { bulk, clearDates } = body as {
        bulk: { trabalhadorId: string; obraId?: string | null; data: string; horas: number; notas?: string | null }[];
        clearDates?: { trabalhadorId: string; data: string }[];
      };
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const { trabalhadorId, data } of (clearDates ?? [])) {
          await client.query(
            `DELETE FROM registos_ponto WHERE trabalhador_id = $1 AND data = $2`,
            [trabalhadorId, data]
          );
        }
        let count = 0;
        for (const rec of bulk) {
          const { trabalhadorId, obraId, data, horas, notas } = rec;
          const horasNum = Math.max(0, parseFloat(String(horas ?? 8)) || 8);
          const wRes = await client.query(`SELECT custo_hora FROM trabalhadores WHERE id = $1`, [trabalhadorId]);
          const custoHora = wRes.rows[0] ? parseFloat(wRes.rows[0].custo_hora) : 0;
          const custo = custoHora > 0 ? custoHora * horasNum : null;
          await client.query(
            `INSERT INTO registos_ponto (trabalhador_id, obra_id, data, horas, custo, notas) VALUES ($1,$2,$3,$4,$5,$6)`,
            [trabalhadorId, obraId || null, data, horasNum, custo, notas || null]
          );
          count++;
        }
        await client.query('COMMIT');
        return NextResponse.json({ ok: true, count }, { status: 201 });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    const { id, trabalhadorId, obraId, data, horas, notas } = body;
    const horasNum = Math.max(0, parseFloat(horas ?? '8') || 8);

    // Update existing record by id
    if (id) {
      const existRes = await pool.query(`SELECT trabalhador_id FROM registos_ponto WHERE id = $1`, [id]);
      const wId = existRes.rows[0]?.trabalhador_id;
      const wRes = wId ? await pool.query(`SELECT custo_hora FROM trabalhadores WHERE id = $1`, [wId]) : { rows: [] };
      const custoHora = (wRes.rows[0] ? parseFloat(wRes.rows[0].custo_hora) : 0);
      const custo = custoHora > 0 ? custoHora * horasNum : null;
      const { rows } = await pool.query(
        `UPDATE registos_ponto SET obra_id=$1, horas=$2, custo=$3, notas=$4, atualizado_em=now()
         WHERE id=$5
         RETURNING id, trabalhador_id AS "trabalhadorId", obra_id AS "obraId", data::text AS data, horas::float AS horas, custo::float AS custo, notas`,
        [obraId || null, horasNum, custo, notas || null, id]
      );
      return NextResponse.json(rows[0], { status: 200 });
    }

    // Insert single record
    if (!trabalhadorId || !data) {
      return NextResponse.json({ error: 'trabalhadorId e data são obrigatórios' }, { status: 400 });
    }
    const wRes = await pool.query(`SELECT custo_hora FROM trabalhadores WHERE id = $1`, [trabalhadorId]);
    const custoHora = wRes.rows[0] ? parseFloat(wRes.rows[0].custo_hora) : 0;
    const custo = custoHora > 0 ? custoHora * horasNum : null;
    const { rows } = await pool.query(
      `INSERT INTO registos_ponto (trabalhador_id, obra_id, data, horas, custo, notas)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, trabalhador_id AS "trabalhadorId", obra_id AS "obraId", data::text AS data, horas::float AS horas, custo::float AS custo, notas`,
      [trabalhadorId, obraId || null, data, horasNum, custo, notas || null]
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    console.error('POST /api/ponto:', err);
    return NextResponse.json({ error: 'Erro ao guardar registo de ponto' }, { status: 500 });
  }
}

// DELETE /api/ponto?id=UUID
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
    const { rowCount } = await pool.query(`DELETE FROM registos_ponto WHERE id = $1`, [id]);
    if (!rowCount) return NextResponse.json({ error: 'Registo não encontrado' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/ponto:', err);
    return NextResponse.json({ error: 'Erro ao apagar registo' }, { status: 500 });
  }
}
