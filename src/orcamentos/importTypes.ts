import type { BudgetMeta } from "./domain";

/** Fonte do documento de importação */
export type ImportSource = "pdf" | "excel" | "csv" | "paste";

/** Papel de uma coluna na tabela extraída */
export type ColumnRole =
  | "code"
  | "description"
  | "quantity"
  | "unit"
  | "price"
  | "ignore";

/** Tipo de linha (dados, cabeçalho, total, ignorar) */
export type RowType = "data" | "header" | "total" | "ignore";

/** Mapeamento: índice da coluna → papel */
export type ColumnMapping = Record<number, ColumnRole>;

/** Mapeamento: índice da linha → tipo */
export type RowTypeMapping = Record<number, RowType>;

/** Chave "row,col" → campo da folha de rosto (meta) */
export type CellToMetaMapping = Record<string, keyof BudgetMeta>;

/** Bloco de texto extraído (ex.: primeira página do PDF) para mapear à folha de rosto */
export interface TextBlock {
  text: string;
  y?: number;
  index?: number;
}

/** Documento de importação: grelha + metadados para mapeamento */
export interface ImportDocument {
  source: ImportSource;
  fileName: string | null;
  /** Grelha linhas × colunas (rows[i][j]) */
  grid: string[][];
  /** Blocos de texto da primeira página (PDF) para folha de rosto */
  textBlocksPage1: TextBlock[];
}
