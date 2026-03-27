export type FaturaEstado = 'RASCUNHO' | 'EMITIDA' | 'PAGA';
export type FaturaTipo  = 'adjudicacao' | 'auto';

export interface FaturaCapituloAuto {
  id: string;
  faturaId: string;
  capitulo: string;
  descricao: string;
  valorContrato: number;
  percentagemAnterior: number;
  percentagemAtual: number;
}

export interface FaturaResumo {
  id: string;
  contratoId: string;
  numero: string;
  tipo: FaturaTipo;
  numeroAuto: number | null;
  estado: FaturaEstado;
  percentagemAdjudicacao: number;
  dataEmissao: string | null;
  dataVencimento: string | null;
  taxaIva: number;
  notas: string;
  criadoEm: string;
  atualizadoEm: string;
  propostaCodigo: string;
  clienteNome: string;
  contratoValorTotal: number;
  valorTrabalhosBruto: number;
  descontoAdjudicacao: number;
  valorBase: number;
  valorIva: number;
  valorTotal: number;
}

export interface Fatura extends FaturaResumo {
  capitulos: FaturaCapituloAuto[];
}

export interface CreateFaturaInput {
  contratoId: string;
  tipo: FaturaTipo;
  percentagemAdjudicacao?: number;
  taxaIva?: number;
  notas?: string;
  capitulos?: Array<{
    capitulo: string;
    descricao: string;
    valorContrato: number;
    percentagemAnterior: number;
    percentagemAtual: number;
  }>;
}
