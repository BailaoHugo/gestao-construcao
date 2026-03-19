import type { PropostaLinha } from "@/propostas/domain";

export const K_DEFAULT = 1.3;

export type DerivadosLinha = {
  kEffective: number;
  precoVendaUnitario: number;
  totalCustoLinha: number;
  totalVendaLinha: number;
};

/**
 * Calcula todos os valores derivados de uma linha:
 * - pu_venda = pu_custo * k (com fallback)
 * - total_custo = quantidade * pu_custo
 * - total_venda = quantidade * pu_venda
 */
export function calcularDerivadosLinha(
  linha: Pick<
    PropostaLinha,
    | "quantidade"
    | "precoCustoUnitario"
    | "k"
    | "totalCustoLinha"
    | "precoVendaUnitario"
    | "totalVendaLinha"
  >,
  kDefault: number = K_DEFAULT,
): DerivadosLinha {
  const quantidade = Number.isFinite(linha.quantidade)
    ? Number(linha.quantidade)
    : 0;
  const precoCusto = Number.isFinite(linha.precoCustoUnitario)
    ? Number(linha.precoCustoUnitario)
    : 0;

  const kEffective =
    linha.k !== null &&
    linha.k !== undefined &&
    Number.isFinite(Number(linha.k))
      ? Number(linha.k)
      : kDefault;

  const precoVendaUnitario = precoCusto * kEffective;
  const totalCustoLinha = quantidade * precoCusto;
  const totalVendaLinha = quantidade * precoVendaUnitario;

  return {
    kEffective,
    precoVendaUnitario,
    totalCustoLinha,
    totalVendaLinha,
  };
}

