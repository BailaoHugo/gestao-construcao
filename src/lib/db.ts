import { Pool } from "pg";

// max:1 evita MaxClientsInSessionMode no Vercel serverless (session mode do Supabase)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: process.env.DATABASE_URL?.includes("localhost")
    ? undefined
    : { rejectUnauthorized: false },
});

export { pool };
