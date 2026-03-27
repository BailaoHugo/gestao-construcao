// módulo faturação v1.0
export type FaturaEstado = 'RASCUNHO' | 'EMITIDA' | 'PAGA' | 'ANULADA';
export type FaturaTipo = 'AUTO' | 'MANUAL';

export interface Fatura {
  id: string;
  contrato_id: string;
  numero: string | null;
  tipo: FaturaTipo;
  numero_auto: number | null;
  estado: FaturaEstado;
  percentagem_adjudicacao: number | null;
  data_emissao: string | null;
  data_vencimento: string | null;
  taxa_iva: number;
  notas: string | null;
  created_at: string;
  updated_at: string;
  // joined from contratos + propostas
  proposta_codigo?: string;
  obra_nome?: string;
  cliente_nome?: string;
}

export interface FaturaAutoCapitulo {
  id: string;
  fatura_id: string;
  capitulo: string;
  descricao: string;
  valor_contrato: number;
  percentagem_anterior: number;
  percentagem_atual: number;
}

export interface FaturaCompleta extends Fatura {
  capitulos: FaturaAutoCapitulo[];
}
