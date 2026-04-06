/**
 * classificarCapituloPorDescricao.ts
 * Classificação de linhas por capítulo.
 * A lógica de classificação automática foi adaptada para catalogo_ennova
 * que usa capitulo_nome (texto) em vez de códigos alfanuméricos.
 * Por agora devolve null — a ligação ao novo catálogo será feita numa fase posterior.
 */

export type ConfiancaCapitulo = "alta" | "media" | "baixa";

export type ClassificacaoCapituloDetalhe = {
  grande_capitulo: string | null;
  capitulo: string | null;
  score: number;
  confianca: ConfiancaCapitulo;
  motivo: string;
};

export function classificarCapituloPorDescricaoCompleto(
  _descricao: string,
): ClassificacaoCapituloDetalhe {
  return {
    grande_capitulo: null,
    capitulo: null,
    score: 0,
    confianca: "baixa",
    motivo: "sem_match",
  };
}

export function classificarCapituloPorDescricao(_descricao: string): {
  grande_capitulo: string | null;
  capitulo: string | null;
} {
  return { grande_capitulo: null, capitulo: null };
}
