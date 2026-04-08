import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// GET /api/ponto?mes=YYYY-MM
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const today = new Date();
    const mes = searchParams.get('mes') ??
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const [yearStr, monthStr] = mes.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    const dataInicio = `${mes}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const dataFim = `${mes}-${String(lastDay).padStart(2, '0')}`;

    const [trabRows, regRows, obraRows] = await Promise.all([
      pool.query(
        `SELECT id, nome, cargo, custo_hora AS "custoHora", ativo
         FROM trabalhadores WHERE ativo = true ORDER BY nome`
      ),
      pool.query(
        `SELECT rp.id,
                rp.trabalhador_id AS "trabalhadorId",
                rp.obra_id        AS "obraId",
                rp.data::text     AS data,
                rp.horas::float   AS horas,
                rp.custo::float   AS custo,
                rp.notas,
                t.nome            AS "trabalhadorNome",
                o.name            AS "obraNome",
                o.code            AS "obraCode"
         FROM   registos_ponto rp
         JOIN   trabalhadores t ON t.id = rp.trabalhador_id
         LEFT JOIN obras o ON o.id = rp.obra_id
         WHERE  rp.data >= $1 AND rp.data <= $2
         ORDER  BY rp.data, t.nome`,
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
      mes,
      dataInicio,
      dataFim,
    });
  } catch (err) {
    console.error('GET /api/ponto:', err);
    return NextResponse.json({ error: 'Erro ao carregar mapa de ponto' }, { status: 500 });
  }
}

// POST /api/ponto — upsert one record (trabalhador × data)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { trabalhadorId, obraId, data, horas, notas } = body;

    if (!trabalhadorId || !data) {
      return NextResponse.json(
        { error: 'trabalhadorId e data são obrigatórios' },
        { status: 400 }
      );
    }

    const horasNum = Math.max(0, parseFloat(horas ?? '8') || 8);

    // Auto-calc custo from worker hourly rate
    const wRes = await pool.query(
      `SELECT custo_hora FROM trabalhadores WHERE id = $1`,
      [trabalhadorId]
    );
    const custoHora = wRes.rows[0] ? parseFloat(wRes.rows[0].custo_hora) : 0;
    const custo = custoHora > 0 ? custoHora * horasNum : null;

    const { rows } = await pool.query(
      `INSERT INTO registos_ponto (trabalhador_id, obra_id, data, horas, custo, notas)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (trabalhador_id, data) DO UPDATE
         SET obra_id       = EXCLUDED.obra_id,
             horas         = EXCLUDED.horas,
             custo         = EXCLUDED.custo,
             notas         = EXCLUDED.notas,
             atualizado_em = now()
       RETURNING id,
                 trabalhador_id AS "trabalhadorId",
                 obra_id        AS "obraId",
                 data::text     AS data,
                 horas::float   AS horas,
                 custo::float   AS custo,
                 notas`,
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

    const { rowCount } = await pool.query(
      `DELETE FROM registos_ponto WHERE id = $1`,
      [id]
    );
    if (!rowCount) {
      return NextResponse.json({ error: 'Registo não encontrado' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/ponto:', err);
    return NextResponse.json({ error: 'Erro ao apagar registo' }, { status: 500 });
  }
}
