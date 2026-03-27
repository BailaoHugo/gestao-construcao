import { NextResponse } from 'next/server';
import { loadFornecedor, updateFornecedor } from '@/controlo-obra/db';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
          const { id } = await params;
          const f = await loadFornecedor(id);
          if (!f) return NextResponse.json({ error: 'not found' }, { status: 404 });
          return NextResponse.json(f);
    } catch (err) {
          return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
          const { id } = await params;
          const body = await request.json();
          const f = await updateFornecedor(id, body);
          if (!f) return NextResponse.json({ error: 'not found' }, { status: 404 });
          return NextResponse.json(f);
    } catch (err) {
          return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
