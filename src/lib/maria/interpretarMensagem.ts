import type { MariaIntent } from "./types";

const CODIGO_REGEX = /([A-Z]\d+\.\d+)/i;
const VERBOS_ADICIONAR =
  /(adiciona|adicionar|insere|inserir|mete|coloca)/i;
const QUANTIDADE_REGEX =
  /(\d+(?:[.,]\d+)?)\s*(m2|m3|ml|un|vg|h|mes|mês)?/i;

export function interpretarMensagem(mensagemRaw: string): MariaIntent {
  const mensagem = mensagemRaw.trim();
  if (!mensagem) {
    return { intent: "searchArtigos", payload: { q: "" } };
  }

  const codigoMatch = mensagem.match(CODIGO_REGEX);
  const codigo = codigoMatch?.[1]?.toUpperCase() ?? null;

  const temVerboAdicionar = VERBOS_ADICIONAR.test(mensagem);

  const quantidadeMatch = mensagem.match(QUANTIDADE_REGEX);
  const quantidadeValor = quantidadeMatch?.[1]
    ? parseFloat(quantidadeMatch[1].replace(",", "."))
    : NaN;
  const quantidade =
    Number.isFinite(quantidadeValor) && quantidadeValor > 0
      ? quantidadeValor
      : 1;

  if (codigo && temVerboAdicionar) {
    return {
      intent: "addLinhaFromCatalogo",
      payload: { codigoArtigo: codigo, quantidade },
    };
  }

  if (codigo) {
    return {
      intent: "getArtigoByCodigo",
      payload: { codigo },
    };
  }

  return {
    intent: "searchArtigos",
    payload: { q: mensagem },
  };
}

