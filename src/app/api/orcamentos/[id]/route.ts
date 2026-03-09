import { NextResponse, type NextRequest } from "next/server";
import type {
  BudgetMeta,
  BudgetStatus,
  DraftBudgetItem,
  SavedBudget,
} from "@/orcamentos/domain";
import { pool } from "@/lib/db";
import { promises as fs } from "fs";
import path from "node:path";
import type { QueryResult } from "pg";

async function walkSavedBudgetsDir(dir: string): Promise<string[]> {
  const entries: string[] = [];

  let names: string[] = [];
  try {
    names = await fs.readdir(dir, { withFileTypes: false } as any);
  } catch {
    return entries;
  }

  for (const name of names) {
    const fullPath = path.join(dir, name);
    if (name.endsWith(".json")) {
      entries.push(fullPath);
      continue;
    }
    try {
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        const child = await walkSavedBudgetsDir(fullPath);
        entries.push(...child);
      }
    } catch {
      // Ignorar entradas que não conseguimos ler.
    }
  }

  return entries;
}

async function loadBudgetFromFiles(id: string): Promise<SavedBudget | null> {
  const baseDir = path.join(process.cwd(), "data/orcamentos/saved");
  const files = await walkSavedBudgetsDir(baseDir);

  for (const filePath of files) {
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as SavedBudget;
      if (parsed.id === id) {
        return {
          ...parsed,
          status: parsed.status ?? "EM_EXECUCAO",
        };
      }
    } catch {
      // Ignorar ficheiros inválidos.
    }
  }

  return null;
}

async function loadBudgetFromDb(id: string): Promise<SavedBudget | null> {
  const client = await pool.connect();
  try {
    const budgetResult = await client.query<{
      id: string;
      created_at: string;
      updated_at: string;
      meta: BudgetMeta;
      status: string | null;
    }>(
      `
        select id, created_at, updated_at, meta, status
        from budgets
        where id = $1
      `,
      [id],
    );

    if (budgetResult.rowCount === 0) {
      return null;
    }

    const budgetRow = budgetResult.rows[0];

    type ItemRow = {
      id: string;
      code: string;
      description: string;
      unit: string | null;
      quantity: string | number;
      unit_price: string | number;
      custo_unitario: string | number | null;
      preco_venda_unitario: string | number | null;
      k_aplicado: string | number | null;
      row_id: string | null;
    };

    const itemsResult: QueryResult<ItemRow> = await client.query(
      `
        select
          id,
          code,
          description,
          unit,
          quantity,
          unit_price,
          custo_unitario,
          preco_venda_unitario,
          k_aplicado,
          row_id
        from budget_items
        where budget_id = $1
        order by id
      `,
      [id],
    );

    const items: DraftBudgetItem[] = itemsResult.rows.map((row) => ({
      rowId: row.row_id ?? row.id,
      code: row.code,
      description: row.description,
      unit: row.unit ?? "",
      quantity: Number(row.quantity),
      unitPrice: Number(row.unit_price),
      custoUnitario:
        row.custo_unitario !== null ? Number(row.custo_unitario) : undefined,
      precoVendaUnitario:
        row.preco_venda_unitario !== null
          ? Number(row.preco_venda_unitario)
          : undefined,
      kAplicado: row.k_aplicado !== null ? Number(row.k_aplicado) : undefined,
      grandeCapituloCode: "",
      capituloCode: "",
    }));

    const budget: SavedBudget = {
      id: budgetRow.id,
      createdAt: budgetRow.created_at,
      updatedAt: budgetRow.updated_at,
      items,
      meta: budgetRow.meta,
      status: (budgetRow.status as BudgetStatus) ?? "EM_EXECUCAO",
    };

    return budget;
  } finally {
    client.release();
  }
}

async function loadBudget(id: string): Promise<SavedBudget | null> {
  try {
    return await loadBudgetFromDb(id);
  } catch {
    return await loadBudgetFromFiles(id);
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const budget = await loadBudget(id);
  if (!budget) {
    return NextResponse.json(
      { error: "Orçamento não encontrado" },
      { status: 404 },
    );
  }
  return NextResponse.json(budget);
}

