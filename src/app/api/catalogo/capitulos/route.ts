import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import {
  GRANDES_CAPITULOS,
  DESCRICOES_CAPITULOS,
} from "@/lib/catalogo/descricoesCapitulos";

type GrandeRow = { grande_capitulo: string | null };
type CapituloRow = {
  capitulo: string | null;
  grande_capitulo: string | null;
};

function parseCapituloCodigo(codigo: string) {
  const trimmed = codigo.trim();
  const match = trimmed.match(/^([A-Za-z]+)(\d+)$/);
  if (!match) {
    return { prefix: trimmed, numero: Number.MAX_SAFE_INTEGER };
  }
  return { prefix: match[1], numero: Number.parseInt(match[2], 10) || 0 };
}

export async function GET() {
  try {
    const [grandesResult, capitulosResult] = await Promise.all([
      pool.query<GrandeRow>(
        `
          select distinct grande_capitulo
          from artigos
          where ativo = true
            and grande_capitulo is not null
            and grande_capitulo <> ''
          order by grande_capitulo asc
        `,
      ),
      pool.query<CapituloRow>(
        `
          select distinct capitulo, grande_capitulo
          from artigos
          where ativo = true
            and capitulo is not null
            and capitulo <> ''
            and grande_capitulo is not null
            and grande_capitulo <> ''
          order by capitulo asc
        `,
      ),
    ]);

    const grandes_capitulos = grandesResult.rows.map((row) => {
      const codigo = row.grande_capitulo?.trim() ?? "";
      return {
        codigo,
        descricao: codigo ? GRANDES_CAPITULOS[codigo] ?? null : null,
      };
    });

    const capitulos = capitulosResult.rows
      .slice()
      .sort((a, b) => {
        const codigoA = a.capitulo?.trim() ?? "";
        const codigoB = b.capitulo?.trim() ?? "";
        const grandeA = a.grande_capitulo?.trim() ?? "";
        const grandeB = b.grande_capitulo?.trim() ?? "";

        if (grandeA !== grandeB) {
          return grandeA.localeCompare(grandeB);
        }

        const pa = parseCapituloCodigo(codigoA);
        const pb = parseCapituloCodigo(codigoB);

        if (pa.prefix !== pb.prefix) {
          return pa.prefix.localeCompare(pb.prefix);
        }

        return pa.numero - pb.numero;
      })
      .map((row) => {
        const codigo = row.capitulo?.trim() ?? "";
        const grandeCodigo = row.grande_capitulo?.trim() ?? "";
        return {
          codigo,
          descricao: codigo ? DESCRICOES_CAPITULOS[codigo] ?? null : null,
          grande_capitulo: grandeCodigo || null,
        };
      });

    return NextResponse.json({ grandes_capitulos, capitulos });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/catalogo/capitulos] GET failed:", message);
    return NextResponse.json(
      { error: "Falha ao carregar lista de capítulos" },
      { status: 500 },
    );
  }
}
