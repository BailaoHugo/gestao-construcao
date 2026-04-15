import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST() {
  await pool.query(`
    ALTER TABLE despesas
      ADD COLUMN IF NOT EXISTS numero_fatura text,
      ADD COLUMN IF NOT EXISTS valor_sem_iva numeric,
      ADD COLUMN IF NOT EXISTS valor_iva numeric,
      ADD COLUMN IF NOT EXISTS valor_total_civa numeric;

    CREATE TABLE IF NOT EXISTS despesa_linhas (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      despesa_id uuid NOT NULL REFERENCES despesas(id) ON DELETE CASCADE,
      descricao text NOT NULL,
      referencia text,
      quantidade numeric DEFAULT 1,
      unidade text DEFAULT 'un',
      preco_unit_sem_iva numeric DEFAULT 0,
      taxa_iva numeric NOT NULL DEFAULT 23,
      desconto_pct numeric DEFAULT 0,
      total_sem_iva numeric NOT NULL,
      criado_em timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_despesa_linhas_despesa_id ON despesa_linhas(despesa_id);
  `);
  return NextResponse.json({ ok: true, message: "Migration executada com sucesso" });
}
