import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET() {
  await pool.query(`
    ALTER TABLE obras
      ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS descricao TEXT,
      ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'em_curso',
      ADD COLUMN IF NOT EXISTS data_inicio DATE,
      ADD COLUMN IF NOT EXISTS data_fim DATE,
      ADD COLUMN IF NOT EXISTS morada TEXT,
      ADD COLUMN IF NOT EXISTS nipc VARCHAR(9);
  `);

  await pool.query(`
    UPDATE obras
    SET morada = 'Alegro Alfragide Av. dos Cavaleiros, 2790-045 Carnaxide',
        updated_at = now()
    WHERE id = '66bcda8a-da76-44e1-9607-0c7e443b78d9'
      AND (morada IS NULL OR morada = '');
  `);

  return NextResponse.json({
    ok: true,
    msg: "Colunas morada + nipc adicionadas a obras; NOOD ALFRAGIDE atualizada",
  });
}
