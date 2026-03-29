import { Pool } from 'pg';
import { getAccessToken, isConfigured } from '@/lib/toconline';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function GET() {
  if (!isConfigured()) {
    return Response.json({ connected: false, reason: 'not_configured' });
  }

  try {
    await getAccessToken();
  } catch (e) {
    return Response.json({
      connected: false,
      reason: 'auth_failed',
      error: (e as Error).message,
    });
  }

  // Contagens de registos sincronizados
  const [forn, clientes, cc, lastSync] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS cnt FROM fornecedores WHERE toconline_id IS NOT NULL`),
    pool.query(`SELECT COUNT(*) AS cnt FROM toconline_clientes`),
    pool.query(`SELECT COUNT(*) AS cnt FROM centros_custo`),
    pool.query(
      `SELECT iniciado_em, concluido_em, estado, resultado
       FROM toconline_sync_log ORDER BY iniciado_em DESC LIMIT 1`,
    ),
  ]);

  return Response.json({
    connected: true,
    stats: {
      fornecedores:  Number(forn.rows[0].cnt),
      clientes:      Number(clientes.rows[0].cnt),
      centrosCusto:  Number(cc.rows[0].cnt),
    },
    lastSync: lastSync.rows[0] ?? null,
  });
}
