import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('key') !== 'migrate2026') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    await pool.query(`ALTER TABLE despesas ADD COLUMN IF NOT EXISTS nome_ficheiro TEXT`);
    await pool.query(`ALTER TABLE despesas ADD COLUMN IF NOT EXISTS centro_custo_nome TEXT`);
    await pool.query(`
      UPDATE despesas SET nome_ficheiro = CONCAT(
        REPLACE(data_despesa::text, '-', ''), '_',
        COALESCE((SELECT code FROM obras WHERE id = centro_custo_id), 'GERAL'), '_',
        LEFT(REGEXP_REPLACE(COALESCE(fornecedor, 'DESC'), '[^a-zA-Z0-9]', '', 'g'), 20), '_',
        LEFT(REGEXP_REPLACE(COALESCE(numero_fatura, ''), '[^a-zA-Z0-9]', '', 'g'), 20), '.jpg'
      ) WHERE nome_ficheiro IS NULL
    `);
    await pool.query(`
      UPDATE despesas d SET centro_custo_nome = (
        SELECT o.nome FROM obras o WHERE o.id = d.centro_custo_id
      ) WHERE centro_custo_nome IS NULL AND centro_custo_id IS NOT NULL
    `);
    return NextResponse.json({ ok: true, message: 'Migration completed' });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
