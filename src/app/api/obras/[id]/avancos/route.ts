import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { rows } = await pool.query(
          `SELECT * FROM obra_avancos WHERE obra_id = $1 ORDER BY numero DESC`,
          [id]
        );
    return NextResponse.json(rows);
  }

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await req.json();
    const { data, percentagem, valor_executado, observacoes } = body;
    const { rows: lastRows } = await pool.query(
          `SELECT COALESCE(MAX(numero), 0) + 1 AS next_num FROM obra_avancos WHERE obra_id = $1`,
          [id]
        );
    const numero = lastRows[0].next_num;
    const { rows } = await pool.query(
          `INSERT INTO obra_avancos (obra_id, numero, data, percentagem, valor_executado, observacoes)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
          [id, numero, data || new Date().toISOString().split("T")[0], percentagem || 0, valor_executado || 0, observacoes || null]
        );
    return NextResponse.json(rows[0], { status: 201 });
  }

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const avancoId = searchParams.get("avancoId");
    if (!avancoId) return NextResponse.json({ error: "avancoId required" }, { status: 400 });
    await pool.query(`DELETE FROM obra_avancos WHERE id = $1 AND obra_id = $2`, [avancoId, id]);
    return NextResponse.json({ ok: true });
  }
