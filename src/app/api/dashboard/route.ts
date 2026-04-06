import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function count(table: string): Promise<number> {
  try {
    const r = await pool.query(`SELECT COUNT(*)::int AS n FROM ${table}`);
    return r.rows[0]?.n ?? 0;
  } catch {
    return 0;
  }
}

async function catalogoCounts() {
  try {
    const r = await pool.query(`
      SELECT tipo_catalogo, COUNT(*)::int AS n
      FROM catalogo_ennova
      WHERE tipo_catalogo IS NOT NULL
      GROUP BY tipo_catalogo
    `);
    const map: Record<string, number> = {};
    for (const row of r.rows) map[row.tipo_catalogo] = row.n;
    const obra_nova    = map["obra_nova"]    ?? 0;
    const reabilitacao = map["reabilitacao"] ?? 0;
    return { obra_nova, reabilitacao, total: obra_nova + reabilitacao };
  } catch {
    return { obra_nova: 0, reabilitacao: 0, total: 0 };
  }
}

export async function GET() {
  const [clientes, obras, propostas, contratos, catalogo] = await Promise.all([
    count("clientes"),
    count("obras"),
    count("propostas"),
    count("contratos"),
    catalogoCounts(),
  ]);
  return NextResponse.json({ clientes, obras, propostas, contratos, catalogo });
}
