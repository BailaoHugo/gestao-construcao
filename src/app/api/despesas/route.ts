import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo");
  const centro = searchParams.get("centro_custo_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const conditions: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (tipo) { conditions.push(`d.tipo = $${i++}`); values.push(tipo); }
  if (centro) { conditions.push(`d.centro_custo_id = $${i++}`); values.push(centro); }
  if (from) { conditions.push(`d.data_despesa >= $${i++}`); values.push(from); }
  if (to) { conditions.push(`d.data_despesa <= $${i++}`); values.push(to); }

  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

  const { rows } = await pool.query(
    `SELECT d.*,
            o.name AS centro_custo_nome,
            o.code AS centro_custo_code
     FROM despesas d
     LEFT JOIN obras o ON o.id = d.centro_custo_id
     ${where}
     ORDER BY d.data_despesa DESC, d.created_at DESC
     LIMIT 500`,
    values
  );
  return NextResponse.json({ rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { data_despesa, descricao, tipo, valor, centro_custo_id, fornecedor, notas, documento_ref } = body;

  if (!descricao || !tipo || !valor) {
    return NextResponse.json({ error: "descricao, tipo e valor sao obrigatorios" }, { status: 400 });
  }

  const { rows } = await pool.query(
    `INSERT INTO despesas (data_despesa, descricao, tipo, valor, centro_custo_id, fornecedor, notas, documento_ref)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [data_despesa ?? new Date().toISOString().slice(0, 10), descricao, tipo, valor,
     centro_custo_id || null, fornecedor || null, notas || null, documento_ref || null]
  );
  return NextResponse.json({ row: rows[0] }, { status: 201 });
}
