import { NextResponse } from 'next/server';
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS registos_ponto (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        trabalhador_id UUID NOT NULL REFERENCES trabalhadores(id) ON DELETE CASCADE,
        obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,
        data DATE NOT NULL,
        horas NUMERIC(4,2) NOT NULL DEFAULT 8,
        custo NUMERIC(10,2),
        notas TEXT,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
        atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    // Migration: remove unique constraint to allow multiple obras per day
    await pool.query(`
      ALTER TABLE registos_ponto
      DROP CONSTRAINT IF EXISTS registos_ponto_trabalhador_id_data_key
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_registos_ponto_data ON registos_ponto (data)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_registos_ponto_trab ON registos_ponto (trabalhador_id)
    `);
    return NextResponse.json({ ok: true, message: 'Tabela registos_ponto pronta' });
  } catch (err) {
    console.error('Setup registos_ponto:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
