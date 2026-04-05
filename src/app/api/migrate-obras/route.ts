import { NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export async function GET() {
  await pool.query(`
    ALTER TABLE obras
    ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL;
  `);
  return NextResponse.json({ ok: true, msg: "Coluna cliente_id (uuid) adicionada a obras" });
}
