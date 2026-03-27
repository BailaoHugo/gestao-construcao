import type { PropostaLinha } from "@/propostas/domain";
import { K_DEFAULT } from "@/lib/propostas/linhaDerivados";
import type { ImportLinhaDraft } from "@/lib/propostas/parseImportedLines";

/** Converte uma linha válida do assistente de importação para `PropostaLinha`. */
export function importDraftToPropostaLinha(d: ImportLinhaDraft): PropostaLinha {
  const q = d.quantidade;
  const puC = d.precoCustoUnitario ?? 0;
  const puV = d.precoVendaUnitario ?? 0;
  const totC = d.totalCustoLinha ?? q * puC;
  const totV = d.totalVendaLinha ?? q * puV;
  const k =
    puC > 0 && puV > 0 && Number.isFinite(puV / puC)
      ? puV / puC
      : K_DEFAULT;

  return {
    id: crypto.randomUUID(),
    artigoId: null,
    origem: "IMPORTADA",
    descricao: d.descricao.trim(),
    unidade: d.unidade.trim(),
    grandeCapitulo: "",
    capitulo: "",
    quantidade: q,
    k,
    precoCustoUnitario: puC,
    totalCustoLinha: totC,
    precoVendaUnitario: puV,
    totalVendaLinha: totV,
  };
}
