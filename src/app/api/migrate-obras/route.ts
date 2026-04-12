import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET() {
    const client = await pool.connect();
    try {
          // Migração obras: colunas
      await client.query(`
            ALTER TABLE obras
                    ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
                            ADD COLUMN IF NOT EXISTS descricao TEXT,
                                    ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'em_curso',
                                            ADD COLUMN IF NOT EXISTS data_inicio DATE,
                                                    ADD COLUMN IF NOT EXISTS data_fim DATE,
                                                            ADD COLUMN IF NOT EXISTS morada TEXT,
                                                                    ADD COLUMN IF NOT EXISTS nipc VARCHAR(9);
                                                                        `);

      // Tabela obra_custos
      await client.query(`
            CREATE TABLE IF NOT EXISTS obra_custos (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                            obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
                                    data DATE NOT NULL DEFAULT CURRENT_DATE,
                                            descricao TEXT NOT NULL,
                                                    categoria TEXT NOT NULL DEFAULT 'outro',
                                                            fornecedor TEXT,
                                                                    numero_fatura TEXT,
                                                                            valor NUMERIC(12,2) NOT NULL DEFAULT 0,
                                                                                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                                                                                          );
                                                                                              `);

      // Tabela obra_avancos
      await client.query(`
            CREATE TABLE IF NOT EXISTS obra_avancos (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                            obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
                                    numero INTEGER NOT NULL,
                                            data DATE NOT NULL DEFAULT CURRENT_DATE,
                                                    percentagem NUMERIC(5,2) NOT NULL DEFAULT 0,
                                                            valor_executado NUMERIC(12,2) NOT NULL DEFAULT 0,
                                                                    observacoes TEXT,
                                                                            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                                                                                    UNIQUE(obra_id, numero)
                                                                                          );
                                                                                              `);

      return NextResponse.json({
              ok: true,
              msg: "Migração completa: obras colunas + obra_custos + obra_avancos",
      });
    } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    } finally {
          client.release();
    }
}
