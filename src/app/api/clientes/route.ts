import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

export async function GET() {
  try {
    const { rows } = await pool.query(
      `SELECT toconline_id AS id, nome, nif, email, telefone, ativo, synced_at AS "syncedAt"
       FROM toconline_clientes
       ORDER BY nome`,
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao carregar clientes' }, { status: 500 });
  }
}
