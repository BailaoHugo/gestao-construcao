import { pool } from "@/lib/db";
import { tocFetch } from "@/lib/toconline";
export const dynamic = "force-dynamic";

export async function GET() {
    const dbUrl = (process.env.DATABASE_URL ?? '').replace(/:([^:@]+)@/, ':***@');
    const NODE_ENV = process.env.NODE_ENV;
    const env_keys = Object.keys(process.env).sort();

  let dbTest: unknown = null;
    try {
          const r = await pool.query("SELECT 1 as test, current_user, version()");
          dbTest = { ok: true, result: r.rows[0] };
    } catch (e) {
          dbTest = { ok: false, error: (e as Error).message };
    }

  // Testar endpoint correto de documentos de compra no TOConline
  const tocTests: Record<string, unknown> = {};
    const endpoints = [
          'commercial_purchases_documents',
          'suppliers',
          'expense_categories',
        ];
    for (const ep of endpoints) {
          try {
                  const raw = await tocFetch<unknown>(`/${ep}?per_page=2`);
                  const arr = Array.isArray(raw) ? raw : ((raw as { data?: unknown[] }).data ?? []);
                  tocTests[ep] = { ok: true, count: arr.length, sample: arr[0] ?? null };
          } catch (e) {
                  const msg = (e as Error).message ?? '';
                  tocTests[ep] = { ok: false, error: msg.slice(0, 200) };
          }
    }

  return Response.json({ DATABASE_URL: dbUrl, NODE_ENV, db_test: dbTest, toc_expense_tests: tocTests, env_keys });
}
