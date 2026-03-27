export type FornecedorTipo = 'fornecedor' | 'subempreiteiro' | 'ambos';

export interface Fornecedor {
    id: string;
    nome: string;
    nif: string | null;
    email: string | null;
    telefone: string | null;
    morada: string | null;
    tipo: FornecedorTipo;
    notas: string | null;
    ativo: boolean;
    criadoEm: string;
    atualizadoEm: string;
}

export interface CreateFornecedorInput {
    nome: string;
    nif?: string;
    email?: string;
    telefone?: string;
    morada?: string;
    tipo?: FornecedorTipo;
    notas?: string;
}

export interface Trabalhador {
    id: string;
    nome: string;
    cargo: string | null;
    custoHora: number;
    ativo: boolean;
    notas: string | null;
    criadoEm: string;
    atualizadoEm: string;
}

export interface CreateTrabalhadorInput {
    nome: string;
    cargo?: string;
    custoHora?: number;
    notas?: string;
}

export type CustoTipo = 'material' | 'subempreitada' | 'mao_de_obra' | 'equipamento';
export type FaturaRecebidaEstado = 'pendente' | 'processando' | 'revisto' | 'aprovado' | 'rejeitado';
export type FaturaRecebidaOrigem = 'email' | 'upload';

export interface DadosExtraidos {
    fornecedorNome?: string;
    fornecedorNif?: string;
    faturaNumero?: string;
    faturaData?: string;
    linhas?: Array<{
      descricao: string;
      quantidade?: number;
      precoUnitario?: number;
      total?: number;
    }>;
    subtotal?: number;
    iva?: number;
    total?: number;
    observacoes?: string;
}

export interface FaturaRecebida {
    id: string;
    contratoId: string | null;
    fornecedorId: string | null;
    origem: FaturaRecebidaOrigem;
    estado: FaturaRecebidaEstado;
    ficheiroUrl: string | null;
    ficheiroNome: string | null;
    ficheiroTipo: string | null;
    dadosExtraidos: DadosExtraidos | null;
    emailRemetente: string | null;
    emailAssunto: string | null;
    emailData: string | null;
    processadoEm: string | null;
    erroProcessamento: string | null;
    notas: string | null;
    criadoEm: string;
    fornecedorNome?: string | null;
    contratoInfo?: string | null;
}

export interface CustoObra {
    id: string;
    contratoId: string;
    faturaRecebidaId: string | null;
    tipo: CustoTipo;
    data: string;
    descricao: string | null;
    capituloRef: string | null;
    fornecedorId: string | null;
    trabalhadorId: string | null;
    quantidade: number | null;
    custoUnitario: number | null;
    valor: number;
    faturaRef: string | null;
    notas: string | null;
    criadoEm: string;
    fornecedorNome?: string | null;
    trabalhadorNome?: string | null;
}

export interface CreateCustoObraInput {
    contratoId: string;
    faturaRecebidaId?: string;
    tipo: CustoTipo;
    data: string;
    descricao?: string;
    capituloRef?: string;
    fornecedorId?: string;
    trabalhadorId?: string;
    quantidade?: number;
    custoUnitario?: number;
    valor: number;
    faturaRef?: string;
    notas?: string;
}

export interface ResumoControloObra {
    contratoId: string;
    totalCustos: number;
    totalMateriais: number;
    totalSubempreitadas: number;
    totalMaoDeObra: number;
    totalEquipamento: number;
    numFaturasPendentes: number;
}
