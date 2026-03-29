import { syncDespesas, isConfigured } from '@/lib/toconline';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: Request) {
  if (!isConfigured()) {
    return Response.json({ ok: false, error: 'TOConline não configurado.' }, { status: 503 });
  }
  try {
    const body = await req.json().catch(() => ({})) as { startDate?: string; endDate?: string };
    const startDate = body.startDate ?? '2026-01-01';
    const endDate   = body.endDate   ?? '2026-01-31';
    const result = await syncDespesas(startDate, endDate);
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
