import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
  const limit  = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const offset = (page - 1) * limit;
  const like = `%${search}%`;
  const rows = await pool.query(
    `SELECT o.*, c.nome AS cliente_nome
     FROM obras o
     LEFT JOIN clientes c ON c.id = o.cliente_id
     WHERE o.nome ILIKE $1 OR COALESCE(o.descricao,'') ILIKE $1
     ORDER BY o.created_at DESC
     LIMIT $2 OFFSET $3`,
    [like, limit, offset]
  );
  const total = await pool.query(
    `SELECT COUNT(*)::int AS n FROM obras WHERE nome ILIKE $1 OR COALESCE(descricao,'') ILIKE $1`,
    [like]
  );
  return NextResponse.json({ data: rows.rows, total: total.rows[0].n });
}

export async function POST(req: NextRequest) {
  const { nome, descricao, estado, cliente_id, data_inicio, data_fim } = await req.json();
  if (!nome) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
  const r = await pool.query(
    `INSERT INTO obras (nome, descricao, estado, cliente_id, data_inicio, data_fim)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [nome, descricao ?? null, estado ?? "em_curso", cliente_id || null, data_inicio || null, data_fim || null]
  );
  return NextResponse.json(r.rows[0], { status: 201 });
}
