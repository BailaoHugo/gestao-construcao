export type EnumType = "Unidade" | "Disciplina" | "Categoria_Custo";

export interface EnumValue {
  enumType: EnumType;
  value: string;
  active: boolean;
  order: number;
  notes?: string;
}

export interface GrandeCapitulo {
  code: string; // ex.: A, B, C
  description: string;
}

export interface Capitulo {
  code: string; // ex.: A1, B2
  description: string;
  grandeCapituloCode: string; // referencia a GrandeCapitulo.code
  kFactor?: number;
}

export interface ArtigoMaster {
  code: string; // ex.: A1.0001
  description: string;
  unit: string;
  grandeCapituloCode: string;
  capituloCode: string;
  subgrupo: string;
  disciplina: string;
  categoriaCusto: string;
  tipoMedicao: string;
  incluiMO: boolean;
  puCusto?: number;
  puVendaFixo?: number;
  observacoes?: string;
  flags: {
    nova: boolean;
    reabilitacao: boolean;
    habitacao: boolean;
    comercio: boolean;
  };
  ativo: boolean;
}

export interface BudgetMeta {
  tituloProposta: string;
  clienteNome: string;
  clienteEntidade: string;
  clienteContacto: string;
  obraNome: string;
  obraEndereco: string;
  obraReferencia: string;
  dataProposta: string;
  validadeDias: number;
  responsavelNome: string;
  responsavelFuncao: string;
  responsavelEmail: string;
  responsavelTelefone: string;
  notasResumo: string;
}

export type BudgetNodeType =
  | "GRANDE_CAPITULO"
  | "CAPITULO"
  | "SUBGRUPO"
  | "ARTIGO";

export interface Budget {
  id: string;
  name: string;
  cliente?: string;
  obra?: string;
  createdAt: string;
  updatedAt: string;
  meta?: BudgetMeta;
}

export interface BudgetNode {
  id: string;
  budgetId: string;
  parentId: string | null;
  type: BudgetNodeType;
  code: string;
  title: string;
  sortOrder: number;
  artigoCode?: string; // se type === ARTIGO, referencia ArtigoMaster.code
}

export interface BudgetLine {
  budgetNodeId: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface DraftBudgetItem {
  code: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  grandeCapituloCode: string;
  capituloCode: string;
}

export interface SavedBudget {
  id: string;
  createdAt: string;
  updatedAt: string;
  items: DraftBudgetItem[];
  meta: BudgetMeta;
}


