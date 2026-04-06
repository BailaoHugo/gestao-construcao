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

export async function GET() {
  const [clientes, obras, propostas, contratos] = await Promise.all([
    count("clientes"),
    count("obras"),
    count("propostas"),
    count("contratos"),
  ]);
  return NextResponse.json({ clientes, obras, propostas, contratos });
}
