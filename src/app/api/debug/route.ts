import { pool } from "@/lib/db";
import { tocFetch } from "@/lib/toconline";

export const dynamic = "force-dynamic";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL
    ? process.env.DATABASE_URL.replace(/:(([^:@]+)+)@/, ":***@")
    : "(nao definido)";

  let dbTest: { ok: boolean; result?: unknown; error?: string } = { ok: false };
  try {
    const res = await pool.query("SELECT 1 as test, current_user, version()");
    dbTest = { ok: true, result: res.rows[0] };
  } catch (err) {
    dbTest = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  let tocSupplierSample: unknown = null;
  try {
    const raw = await tocFetch<unknown>("/suppliers");
    const arr = Array.isArray(raw) ? raw : (raw as { data?: unknown[] }).data ?? [];
    tocSupplierSample = arr[0] ?? null;
  } catch (err) {
    tocSupplierSample = { error: err instanceof Error ? err.message : String(err) };
  }

  return Response.json({
    DATABASE_URL: dbUrl,
    NODE_ENV: process.env.NODE_ENV,
    db_test: dbTest,
    toc_supplier_sample: tocSupplierSample,
    env_keys: Object.keys(process.env).sort(),
  });
}
