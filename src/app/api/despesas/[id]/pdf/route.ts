import { tocFetch } from '@/lib/toconline';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface PrintUrlResponse {
    scheme: string;
    host: string;
    path: string;
}

export async function GET(
    _req: NextRequest,
    context: { params: Promise<{ id: string }> }
  ) {
    const { id } = await context.params;
    try {
          const data = await tocFetch<PrintUrlResponse>(
                  `/url_for_print/${id}?filter[type]=PurchasesDocument&filter[copies]=1`
                );
          const url = `${data.scheme}://${data.host}${data.path}`;
          return NextResponse.redirect(url);
    } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error('[api/despesas/[id]/pdf] error:', message);
          return NextResponse.json({ error: message }, { status: 500 });
    }
}
