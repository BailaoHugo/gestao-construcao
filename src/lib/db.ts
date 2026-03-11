import { Pool } from "pg";

// O código usa apenas process.env.DATABASE_URL (formato postgresql://…).
// Para Vercel/serverless, usa a connection string do Supabase "Connection Pooler"
// (Settings → Database → Connection string → URI, modo "Session" ou "Transaction";
// host tipo aws-0-XX.pooler.supabase.com, porta 6543) para evitar esgotar ligações.
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Em ambiente de desenvolvimento é útil ter um erro claro
  // se a variável de ambiente não estiver definida.
  // eslint-disable-next-line no-console
  console.warn(
    "[db] DATABASE_URL não está definido. A ligação à base de dados irá falhar.",
  );
}

// Supabase exige TLS; usar SSL sempre que a URL for do Supabase
const useSsl =
  !!process.env.VERCEL ||
  (typeof connectionString === "string" && connectionString.includes("supabase"));

export const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

export async function withTransaction<T>(
  fn: (client: import("pg").PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
