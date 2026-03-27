// módulo faturação v1.0
export type FaturaEstado = 'RASCUNHO' | 'EMITIDA' | 'PAGA' | 'ANULADA';
export type FaturaTipo = 'auto' | 'manual';

export interface FaturaAutoCapitulo {
  id: string;
  faturaId: string;
  capitulo: string;
  descricao: string;
  valorContrato: number;
  percentagemAnterior: number;
  percentagemAtual: number;
}

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
  // present when loaded via loadFaturaCompleta
  capitulos?: FaturaAutoCapitulo[];
}

export interface FaturaCompleta extends Fatura {
  capitulos: FaturaAutoCapitulo[];
}
