import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const estado = searchParams.get("estado") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));
  const offset = (page - 1) * limit;
  const like = `%${search}%`;

  const estadoCond = estado
    ? `AND o.estado = '${estado.replace(/'/g, "''")}'`
    : "";

  const rows = await pool.query(
    `SELECT o.id, o.code, o.name AS nome, o.descricao, o.estado,
            o.cliente_id, o.data_inicio, o.data_fim, o.created_at,
            o.morada, o.nipc,
            c.nome AS cliente_nome
     FROM obras o
     LEFT JOIN clientes c ON c.id = o.cliente_id
     WHERE (o.name ILIKE $1 OR o.code ILIKE $1 OR COALESCE(o.descricao,'') ILIKE $1)
     ${estadoCond}
     ORDER BY o.code ASC
     LIMIT $2 OFFSET $3`,
    [like, limit, offset],
  );

  const total = await pool.query(
    `SELECT COUNT(*)::int AS n FROM obras o
     WHERE (o.name ILIKE $1 OR o.code ILIKE $1 OR COALESCE(o.descricao,'') ILIKE $1)
     ${estadoCond}`,
    [like],
  );

  const data = rows.rows;
  return NextResponse.json({ data, items: data, total: total.rows[0].n });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = (body.name ?? body.nome ?? "").trim();
  const code = (body.code ?? "").trim();
  const descricao = body.descricao ?? null;
  const estado = body.estado ?? "ativo";
  const clienteId = body.cliente_id || null;
  const dataIni = body.data_inicio || null;
  const dataFim = body.data_fim || null;
  const morada = body.morada ?? null;
  const nipc = body.nipc ?? null;

  if (!name) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
  if (!code) return NextResponse.json({ error: "Código obrigatório" }, { status: 400 });

  const r = await pool.query(
    `INSERT INTO obras (code, name, descricao, estado, cliente_id, data_inicio, data_fim, morada, nipc)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [code, name, descricao, estado, clienteId, dataIni, dataFim, morada, nipc],
  );
  return NextResponse.json(r.rows[0], { status: 201 });
}
