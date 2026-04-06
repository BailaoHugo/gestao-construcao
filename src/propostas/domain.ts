export type PropostaEstado = "RASCUNHO" | "EMITIDA" | "APROVADA";

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
  /** ID do cliente na tabela clientes (ligação relacional opcional) */
  clienteId?: string | null;
  obraNome?: string;
  obraMorada?: string;
  /** ID da obra na tabela obras (ligação relacional opcional) */
  obraId?: string | null;
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
