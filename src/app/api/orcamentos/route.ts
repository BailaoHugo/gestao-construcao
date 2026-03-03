import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = body.items;
    const meta = body.meta ?? {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "items must be a non-empty array" },
        { status: 400 },
      );
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    const payload = {
      id,
      createdAt: now,
      updatedAt: now,
      items,
      meta,
    };

    const dir = path.join(process.cwd(), "data/orcamentos/saved");
    await mkdir(dir, { recursive: true });
    const safeTimestamp = now.replace(/[:.]/g, "-");
    const filePath = path.join(dir, `${safeTimestamp}-${id}.json`);

    await writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");

    return NextResponse.json({ id });
  } catch (err) {
    console.error("Failed to save orçamento", err);
    return NextResponse.json(
      { error: "Failed to save orçamento" },
      { status: 500 },
    );
  }
}

