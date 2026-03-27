// módulo faturação v1.0
export type FaturaEstado = 'RASCUNHO' | 'EMITIDA' | 'PAGA' | 'ANULADA';
export type FaturaTipo  = 'auto' | 'manual' | 'adjudicacao';

export interface FaturaCapituloAuto {
  id: string;
  faturaId: string;
  capitulo: string;
  descricao: string;
  valorContrato: number;
  percentagemAnterior: number;
  percentagemAtual: number;
}

/** @deprecated use FaturaCapituloAuto */
export type FaturaAutoCapitulo = FaturaCapituloAuto;

export interface Fatura {
  id: string;
  contratoId: string;
  numero: string | null;
  tipo: FaturaTipo;
  numeroAuto: number | null;
  estado: FaturaEstado;
  percentagemAdjudicacao: number | null;
  dataEmissao: string | null;
  dataVencimento: string | null;
  taxaIva: number;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
  // joined from contratos + propostas
  propostaCodigo: string;
  obraNome: string;
  clienteNome: string;
  contratoValorTotal: number;
  // computed financial values
  valorTrabalhosBruto: number;
  descontoAdjudicacao: number;
  valorBase: number;
  valorIva: number;
  valorTotal: number;
  // populated by loadFaturaCompleta; empty array otherwise
  capitulos: FaturaCapituloAuto[];
}

/** FaturaCompleta is an alias kept for backwards compat */
export type FaturaCompleta = Fatura;

/** FaturaResumo is Fatura without capitulos */
export type FaturaResumo = Omit<Fatura, 'capitulos'>;

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
