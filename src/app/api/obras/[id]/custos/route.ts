import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { rows } = await pool.query(
          `SELECT * FROM obra_custos WHERE obra_id = $1 ORDER BY data DESC, created_at DESC`,
          [id]
        );
    return NextResponse.json(rows);
  }

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await req.json();
    const { data, descricao, categoria, fornecedor, numero_fatura, valor } = body;
    const { rows } = await pool.query(
          `INSERT INTO obra_custos (obra_id, data, descricao, categoria, fornecedor, numero_fatura, valor)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
          [id, data || new Date().toISOString().split("T")[0], descricao, categoria || "outro", fornecedor || null, numero_fatura || null, valor]
        );
    return NextResponse.json(rows[0], { status: 201 });
  }

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const custoId = searchParams.get("custoId");
    if (!custoId) return NextResponse.json({ error: "custoId required" }, { status: 400 });
    await pool.query(`DELETE FROM obra_custos WHERE id = $1 AND obra_id = $2`, [custoId, id]);
    return NextResponse.json({ ok: true });
  }
