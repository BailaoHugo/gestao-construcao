import type { PropostaLinha } from "@/propostas/domain";
import { calcularDerivadosLinha, K_DEFAULT } from "@/lib/propostas/linhaDerivados";

export type TotaisLinhas = {
  totalCusto: number;
  totalVenda: number;
  margem: number;
};

export type RenderItem =
  | { type: "grandeTitle"; grandeCapitulo: string | null }
  | { type: "capTitle"; capitulo: string | null }
  | {
      type: "capSubtotal";
      capitulo: string | null;
      totais: TotaisLinhas;
    }
  | {
      type: "grandeSubtotal";
      grandeCapitulo: string | null;
      totais: TotaisLinhas;
    }
  | { type: "totalGeral"; totais: TotaisLinhas }
  | { type: "linha"; linha: PropostaLinha };

function normalizarCapitulo(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  return t ? t : null;
}

export function calcularTotaisLinhas(linhas: PropostaLinha[]): TotaisLinhas {
  let totalCusto = 0;
  let totalVenda = 0;

  for (const linha of linhas) {
    const derivados = calcularDerivadosLinha(linha, K_DEFAULT);
    totalCusto += derivados.totalCustoLinha;
    totalVenda += derivados.totalVendaLinha;
  }

  return {
    totalCusto,
    totalVenda,
    margem: totalVenda - totalCusto,
  };
}

/**
 * Agrupa linhas por `grandeCapitulo` e depois por `capitulo`, respeitando a
 * propriedade `ordem` quando existe.
 *
 * Retorna uma sequência pronta para renderizar: títulos, linhas e subtotais.
 */
export function agruparLinhasPorGrandeECapitulo(
  linhas: PropostaLinha[],
): RenderItem[] {
  const nilKey = "__NULL__";

  const linhasComOrdem = linhas
    .map((linha, idx) => ({
      linha,
      ordem: Number.isFinite(linha.ordem)
        ? (linha.ordem as number)
        : idx + 1,
    }))
    .sort((a, b) => a.ordem - b.ordem);

  type CapGroup = {
    capitulo: string | null;
    linhas: PropostaLinha[];
  };

  type GrandeGroup = {
    grandeCapitulo: string | null;
    capitulos: Map<string, CapGroup>;
    ordemCaps: string[]; // ordem de inserção
  };

  const grandes = new Map<string, GrandeGroup>();
  const ordemGrandes: string[] = [];

  const grandeKey = (grande: string | null) =>
    grande === null ? nilKey : `G:${grande}`;
  const capKey = (cap: string | null) =>
    cap === null ? nilKey : `C:${cap}`;

  for (const { linha } of linhasComOrdem) {
    const grande = normalizarCapitulo(linha.grandeCapitulo);
    const cap = normalizarCapitulo(linha.capitulo);

    const gKey = grandeKey(grande);
    const cKey = capKey(cap);

    let g = grandes.get(gKey);
    if (!g) {
      g = {
        grandeCapitulo: grande,
        capitulos: new Map<string, CapGroup>(),
        ordemCaps: [],
      };
      grandes.set(gKey, g);
      ordemGrandes.push(gKey);
    }

    let c = g.capitulos.get(cKey);
    if (!c) {
      c = { capitulo: cap, linhas: [] };
      g.capitulos.set(cKey, c);
      g.ordemCaps.push(cKey);
    }

    c.linhas.push(linha);
  }

  const itens: RenderItem[] = [];

  for (const gKey of ordemGrandes) {
    const g = grandes.get(gKey);
    if (!g) continue;

    itens.push({ type: "grandeTitle", grandeCapitulo: g.grandeCapitulo });

    for (const cKey of g.ordemCaps) {
      const c = g.capitulos.get(cKey);
      if (!c) continue;

      itens.push({ type: "capTitle", capitulo: c.capitulo });

      for (const linha of c.linhas) {
        itens.push({ type: "linha", linha });
      }

      itens.push({
        type: "capSubtotal",
        capitulo: c.capitulo,
        totais: calcularTotaisLinhas(c.linhas),
      });
    }

    const linhasGrande = g.ordemCaps.flatMap(
      (k) => g.capitulos.get(k)?.linhas ?? [],
    );

    itens.push({
      type: "grandeSubtotal",
      grandeCapitulo: g.grandeCapitulo,
      totais: calcularTotaisLinhas(linhasGrande),
    });
  }

  itens.push({
    type: "totalGeral",
    totais: calcularTotaisLinhas(linhas),
  });

  return itens;
}

