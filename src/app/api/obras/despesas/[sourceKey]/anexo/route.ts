import { NextResponse, type NextRequest } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { pool } from "@/lib/db";

function guessContentType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".gif") return "image/gif";
  if (ext === ".webp") return "image/webp";
  if (ext === ".txt") return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

async function firstExistingPath(paths: string[]): Promise<string | null> {
  for (const p of paths) {
    try {
      const st = await fs.stat(p);
      if (st.isFile()) return p;
    } catch {
      // ignore
    }
  }
  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sourceKey: string }> },
) {
  const { sourceKey } = await params;
  if (!sourceKey) {
    return NextResponse.json({ error: "sourceKey em falta" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const result = await client.query<{
      obra_folder: string;
      source_file_name: string;
      source_file_rel_path: string | null;
    }>(
      `
        select obra_folder, source_file_name, source_file_rel_path
        from toconline_costs_staging
        where source_key = $1
        limit 1
      `,
      [sourceKey],
    );

    if (!result.rowCount) {
      return NextResponse.json({ error: "Anexo nao encontrado" }, { status: 404 });
    }

    const row = result.rows[0];
    const fileName = row.source_file_name;
    const cwd = process.cwd();
    const organizedPath = path.resolve(
      cwd,
      "tmp/toconline-ad-test/organized-by-obra",
      row.obra_folder || "SEM_OBRA",
      fileName,
    );
    const extractedPath = row.source_file_rel_path
      ? path.resolve(cwd, "tmp/toconline-ad-test/extracted", row.source_file_rel_path)
      : "";

    const filePath = await firstExistingPath(
      [organizedPath, extractedPath].filter(Boolean),
    );
    if (!filePath) {
      return NextResponse.json({ error: "Ficheiro fisico nao encontrado" }, { status: 404 });
    }

    const bytes = await fs.readFile(filePath);
    const contentType = guessContentType(fileName);

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${fileName.replace(/"/g, "_")}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/obras/despesas/anexo] failed:", message);
    return NextResponse.json({ error: "Falha ao carregar anexo" }, { status: 500 });
  } finally {
    client.release();
  }
}
