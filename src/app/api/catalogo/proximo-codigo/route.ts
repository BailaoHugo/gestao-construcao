import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/lib/db";

type Row = {
  codigo: string | null;
};

export async function GET(req: NextRequest) {
  const capitulo = req.nextUrl.searchParams.get("capitulo")?.trim();

  if (!capitulo) {
    return NextResponse.json(
      { error: "Parâmetro 'capitulo' é obrigatório" },
      { status: 400 },
    );
  }

  try {
    const result = await pool.query<Row>(
      `
        select codigo
        from artigos
        where capitulo = $1
          and codigo like $2
        order by split_part(codigo, '.', 2)::int desc
        limit 1
      `,
      [capitulo, `${capitulo}.%`],
    );

    let nextNumber = 1;

    const row = result.rows[0];
    if (row?.codigo) {
      const parts = row.codigo.split(".");
      if (parts.length === 2) {
        const n = Number.parseInt(parts[1], 10);
        if (Number.isFinite(n) && n >= 0) {
          nextNumber = n + 1;
        }
      }
    }

    const sufixo = String(nextNumber).padStart(4, "0");
    const codigo = `${capitulo}.${sufixo}`;

    return NextResponse.json({ codigo });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error("[api/catalogo/proximo-codigo] GET failed:", message);
    return NextResponse.json(
      { error: "Falha ao sugerir próximo código" },
      { status: 500 },
    );
  }
}

