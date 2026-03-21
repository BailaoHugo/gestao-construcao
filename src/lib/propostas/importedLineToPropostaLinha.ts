import type { PropostaLinha } from "@/propostas/domain";
import { kApartirDePrecosUnitarios } from "@/lib/propostas/linhaDerivados";
import type { ParsedImportedLine } from "@/lib/propostas/parseImportedLines";

/** Converte uma linha válida do assistente de importação para `PropostaLinha`. */
export function importedParsedLineToPropostaLinha(
  l: ParsedImportedLine,
): PropostaLinha {
  const quantidade = l.quantidade ?? 0;
  const precoVendaUnitario = l.preco_venda_unitario ?? 0;
  const precoCustoUnitario = l.preco_custo_unitario ?? 0;
  return {
    id: crypto.randomUUID(),
    artigoId: null,
    origem: "IMPORTADA",
    descricao: l.descricao,
    unidade: l.unidade ?? "",
    grandeCapitulo: "",
    capitulo: l.capitulo ?? "",
    quantidade,
    k: kApartirDePrecosUnitarios(precoCustoUnitario, precoVendaUnitario),
    precoCustoUnitario,
    totalCustoLinha:
      l.total_custo_linha ?? quantidade * precoCustoUnitario,
    precoVendaUnitario,
    totalVendaLinha:
      l.total_venda_linha ?? quantidade * precoVendaUnitario,
  };
}
