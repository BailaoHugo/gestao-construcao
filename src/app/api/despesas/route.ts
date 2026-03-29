import { loadDespesas } from '@/lib/toconline';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start') ?? '2026-01-01';
    const end   = searchParams.get('end')   ?? '2026-01-31';
    const data = await loadDespesas(start, end);
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
