import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// GET /api/clientes?search=&page=1&limit=50
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
  const limit  = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));
  const offset = (page - 1) * limit;

  const where = search
    ? `WHERE nome ILIKE $1 OR email ILIKE $1 OR nif ILIKE $1 OR telefone ILIKE $1`
    : "";
  const params = search ? [`%${search}%`] : [];

  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT * FROM clientes ${where} ORDER BY nome ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total FROM clientes ${where}`,
      params
    ),
  ]);

  return NextResponse.json({
    rows:  rows.rows,
    total: count.rows[0].total,
    page,
    limit,
  });
}

// POST /api/clientes  — criar novo cliente
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nome, email, telefone, nif, morada, notas } = body;

  if (!nome?.trim()) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  const { rows } = await pool.query(
    `INSERT INTO clientes (nome, email, telefone, nif, morada, notas)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [nome.trim(), email ?? null, telefone ?? null, nif ?? null, morada ?? null, notas ?? null]
  );

  return NextResponse.json(rows[0], { status: 201 });
}
