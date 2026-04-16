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
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("vendas sync error:", e);
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
