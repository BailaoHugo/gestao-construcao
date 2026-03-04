import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Em ambiente de desenvolvimento é útil ter um erro claro
  // se a variável de ambiente não estiver definida.
  // eslint-disable-next-line no-console
  console.warn(
    "[db] DATABASE_URL não está definido. A ligação à base de dados irá falhar.",
  );
}

const isVercel = !!process.env.VERCEL;

export const pool = new Pool({
  connectionString,
  // Supabase exige TLS; em Vercel garantimos SSL, na VM (onde não há saída)
  // deixamos sem ssl para não causar erros desnecessários.
  ssl: isVercel
    ? {
        rejectUnauthorized: false,
      }
    : undefined,
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

