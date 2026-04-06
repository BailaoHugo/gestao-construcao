import { Pool } from "pg";

// Para Vercel serverless: usar pool pequeno para não esgotar ligações do Supabase
// Em session mode o Supabase limita por pool_size — max:1 garante 1 ligação por instância
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false },
});

export { pool };
