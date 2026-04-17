import { NextRequest, NextResponse } from "next/server";
import { syncVendasToApp, isConfigured } from "@/lib/toconline";

export async function POST(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      { ok: false, error: "TOConline nao configurado." },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ??
    new Date(Date.now() - 365 * 86400_000).toISOString().slice(0, 10);
  const to = searchParams.get("to") ??
    new Date().toISOString().slice(0, 10);

  try {
    const result = await syncVendasToApp(from, to);
    if (result.error) {
      if (result.error.includes('TOConline_REAUTH_REQUIRED')) {
        return NextResponse.json({
          ok: false,
          reauth_required: true,
          error: 'TOConline precisa de re-autorizacao. Acede a /admin/toconline para reconectar.',
          upserted: 0,
        });
      }
      return NextResponse.json({ ok: false, error: result.error, upserted: 0 });
    }
  return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("vendas sync error:", e);
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
