export type PropostaEstado = "RASCUNHO" | "EMITIDA";

export interface PropostaResumo {
  id: string;
  codigo: string;
  clienteNome: string;
  obraNome?: string;
  revisaoAtual: number;
  estadoAtual: PropostaEstado;
  dataCriacao: string; // ISO date
  totalAtual: number;
}

export interface PropostaFolhaRosto {
  clienteNome: string;
  clienteContacto?: string;
  clienteEmail?: string;
  obraNome?: string;
  obraMorada?: string;
  dataProposta: string; // ISO date
  validadeDias?: number;
  validadeTexto?: string;
  referenciaInterna?: string;
  notas?: string;
}

export interface PropostaLinha {
  id: string;
  /** Ordem de exibição na revisão (opcional; backend pode derivar do array). */
  ordem?: number | null;
  artigoId?: string | null;
  codigoArtigo?: string | null;
  origem: "CATALOGO" | "LIVRE" | "IMPORTADA" | "manual";
  descricao: string;
  unidade: string;
  grandeCapitulo?: string | null;
  capitulo?: string | null;
  /** Coeficiente de venda (ex.: 1.30). Default em BD: 1.30. */
  k?: number | null;
  quantidade: number;
  precoCustoUnitario: number;
  totalCustoLinha: number;
  precoVendaUnitario: number;
  totalVendaLinha: number;
  /** Observações da linha (texto livre). */
  observacoes?: string | null;
}

export interface PropostaRevisao {
  id: string;
  propostaId: string;
  numeroRevisao: number;
  estado: PropostaEstado;
  folhaRosto: PropostaFolhaRosto;
  linhas: PropostaLinha[];
  totalCusto: number;
  totalVenda: number;
  margemValor: number;
  margemPercentagem: number;
  criadoEm: string; // ISO date-time
  atualizadoEm: string; // ISO date-time
}

export interface Proposta {
  id: string;
  codigo: string;
  estado: PropostaEstado;
  revisaoAtual: PropostaRevisao;
  todasRevisoes: PropostaRevisao[];
}

// Nota: estes tipos estão pensados para mapear, numa fase posterior, para
// tabelas Supabase como:
// - propostas (id, codigo, estado, created_at, ...)
// - proposta_revisoes (id, proposta_id, numero, estado, folha_rosto_json, total, ...)
// - proposta_linhas (id, revisao_id, artigo_id, origem, descricao, unidade, quantidade, preco_unitario, total_linha, ...)
// A integração real com Supabase será feita mais tarde.

