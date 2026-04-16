import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const obraId = searchParams.get("obra_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const conditions: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (obraId) {
    conditions.push(`fv.obra_id = $${i++}`);
    values.push(obraId);
  }
  if (from) {
    conditions.push(`fv.data >= $${i++}`);
    values.push(from);
  }
  if (to) {
    conditions.push(`fv.data <= $${i++}`);
    values.push(to);
  }

  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

  try {
    const { rows } = await pool.query(
      `SELECT fv.*, o.name AS obra_nome, o.code AS obra_code
       FROM faturas_venda fv
       LEFT JOIN obras o ON o.id = fv.obra_id
       ${where}
       ORDER BY fv.data DESC, fv.criado_em DESC
       LIMIT 500`,
      values
    );

    const total = rows.reduce((s: number, r: { total: string }) => s + parseFloat(r.total || "0"), 0);
    const totalSemIva = rows.reduce((s: number, r: { valor_sem_iva: string }) => s + parseFloat(r.valor_sem_iva || "0"), 0);

    return NextResponse.json({ rows, total, totalSemIva });
  } catch (err) {
    console.error("vendas GET error:", err);
    return NextResponse.json({ rows: [], total: 0, totalSemIva: 0 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    numero, tipo_documento, data, data_vencimento,
    cliente_nome, cliente_nif,
    valor_sem_iva, valor_iva, total,
    obra_id, notas, estado,
  } = body;

  if (!numero || total == null) {
    return NextResponse.json({ error: "numero e total sao obrigatorios" }, { status: 400 });
  }

  const { rows } = await pool.query(
    `INSERT INTO faturas_venda
       (numero, tipo_documento, data, data_vencimento, cliente_nome, cliente_nif,
        valor_sem_iva, valor_iva, total, obra_id, notas, estado)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      numero, tipo_documento || null,
      data ?? new Date().toISOString().slice(0, 10),
      data_vencimento || null,
      cliente_nome || null, cliente_nif || null,
      valor_sem_iva != null ? valor_sem_iva : null,
      valor_iva != null ? valor_iva : null,
      total,
      obra_id || null, notas || null,
      estado || "emitida",
    ]
  );
  return NextResponse.json({ row: rows[0] }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, obra_id, estado } = body;
  if (!id) return NextResponse.json({ error: "id obrigatorio" }, { status: 400 });

  const { rows } = await pool.query(
    `UPDATE faturas_venda
     SET obra_id = COALESCE($2, obra_id),
         estado = COALESCE($3, estado),
         atualizado_em = now()
     WHERE id = $1
     RETURNING *`,
    [id, obra_id || null, estado || null]
  );
  return NextResponse.json({ row: rows[0] });
}
