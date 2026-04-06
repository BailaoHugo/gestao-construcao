import { NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export async function GET() {
  await pool.query(`
    ALTER TABLE obras
      ADD COLUMN IF NOT EXISTS cliente_id  UUID       REFERENCES clientes(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS descricao   TEXT,
      ADD COLUMN IF NOT EXISTS estado      TEXT       NOT NULL DEFAULT 'em_curso',
      ADD COLUMN IF NOT EXISTS data_inicio DATE,
      ADD COLUMN IF NOT EXISTS data_fim    DATE;
  `);
  return NextResponse.json({ ok: true, msg: "Colunas adicionadas a obras (cliente_id, descricao, estado, data_inicio, data_fim)" });
}
