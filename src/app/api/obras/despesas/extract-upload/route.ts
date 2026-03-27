import path from "node:path";
import { pathToFileURL } from "node:url";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024;

type ExtractResult = {
  status: string;
  extractor: string;
  confidence_score: number;
  raw_text: string | null;
  header_json: unknown;
  lines_json: unknown;
  validation_json: unknown;
  error: string | null;
};

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Corpo inválido (multipart esperado)" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Ficheiro em falta (campo file)" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Ficheiro demasiado grande (máx. ${MAX_BYTES / 1024 / 1024} MB)` },
      { status: 413 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const fileName = file.name || "upload.pdf";

  const coreUrl = pathToFileURL(
    path.join(process.cwd(), "scripts/lib/toconline-extract-core.mjs"),
  ).href;

  const { extractInvoiceFromBuffer } = (await import(coreUrl)) as {
    extractInvoiceFromBuffer: (opts: {
      buffer: Buffer;
      fileName: string;
      row?: Record<string, unknown>;
    }) => Promise<ExtractResult>;
  };

  const result = await extractInvoiceFromBuffer({
    buffer: buf,
    fileName,
    row: {},
  });

  return NextResponse.json({
    fileName,
    fileSize: file.size,
    ...result,
  });
}
