import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

// Log URL sem password para diagnóstico em produção
const safeUrl = connectionString
  ? connectionString.replace(/:([^:@]+)@/, ":***@")
  : "(não definido)";
// eslint-disable-next-line no-console
console.log("[db] DATABASE_URL:", safeUrl);

if (!connectionString) {
  // eslint-disable-next-line no-console
  console.warn(
    "[db] DATABASE_URL não está definido. A ligação à base de dados irá falhar.",
  );
}

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

pool.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("[db] Pool error:", err.message);
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
