import { runFullSync, isConfigured } from '@/lib/toconline';

export async function POST() {
  if (!isConfigured()) {
    return Response.json(
      { ok: false, error: 'TOConline nao configurado. Defina as variaveis de ambiente.' },
      { status: 503 },
    );
  }

  try {
    const results = await runFullSync();
    const hasErrors = Object.values(results).some(r => 'error' in r);
    return Response.json({ ok: !hasErrors, results }, { status: hasErrors ? 207 : 200 });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
