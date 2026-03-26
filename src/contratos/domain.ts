export type ContratoEstado = "RASCUNHO" | "EMITIDO";

export interface ClausulaContrato {
  numero: number;
  titulo: string;
  texto: string;
}

export interface ContratoResumo {
  id: string;
  propostaCodigo: string;
  revisaoNumero: number;
  clienteNome: string;
  estado: ContratoEstado;
  dataContrato: string | null;
  totalVenda: number;
  criadoEm: string;
}

export interface Contrato {
  id: string;
  propostaId: string;
  revisaoId: string;
  estado: ContratoEstado;
  dataContrato: string | null;
  dataConclusaoPrevista: string | null;
  signatarioDonoNome: string;
  signatarioDonoFuncao: string;
  signatarioEmpreiteiroNome: string;
  signatarioEmpreiteiroFuncao: string;
  clausulas: ClausulaContrato[];
  // Enriched from proposta/revisao
  propostaCodigo: string;
  revisaoNumero: number;
  clienteNome: string;
  clienteNipc: string | null;
  obraNome: string | null;
  obraMorada: string | null;
  totalVenda: number;
  dataProposta: string | null;
  criadoEm: string;
  atualizadoEm: string;
}
