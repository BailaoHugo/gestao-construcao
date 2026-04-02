import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') ?? '';
    const { rows } = await pool.query(
      `SELECT id, code, name,
              COALESCE(descricao, '') AS descricao,
              COALESCE(estado, 'ativo') AS estado,
              COALESCE(cliente_nome, '') AS cliente_nome,
              data_inicio, data_fim,
              created_at
       FROM obras
       WHERE ($1 = '' OR lower(name) LIKE '%' || lower($1) || '%'
                      OR lower(code) LIKE '%' || lower($1) || '%')
       ORDER BY name`,
      [q],
    );
    // Scan page expects { items: [{ nome, descricao }] }
    const items = rows.map(r => ({
      id: r.id,
      code: r.code,
      nome: r.name,
      descricao: r.descricao,
      estado: r.estado,
      cliente_nome: r.cliente_nome,
      data_inicio: r.data_inicio,
      data_fim: r.data_fim,
    }));
    return NextResponse.json({ items });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao carregar obras' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.code || !body.name)
      return NextResponse.json({ error: 'code e name obrigatórios' }, { status: 400 });
    const { rows } = await pool.query(
      `INSERT INTO obras (code, name, descricao, estado, cliente_nome, data_inicio, data_fim)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (code) DO UPDATE
         SET name = EXCLUDED.name,
             descricao = EXCLUDED.descricao,
             estado = EXCLUDED.estado,
             cliente_nome = EXCLUDED.cliente_nome,
             data_inicio = EXCLUDED.data_inicio,
             data_fim = EXCLUDED.data_fim,
             updated_at = now()
       RETURNING *`,
      [body.code, body.name, body.descricao ?? null, body.estado ?? 'ativo',
       body.cliente_nome ?? null, body.data_inicio ?? null, body.data_fim ?? null],
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao criar obra' }, { status: 500 });
  }
}
