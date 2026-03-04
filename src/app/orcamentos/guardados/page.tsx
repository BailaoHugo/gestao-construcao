import { MainLayout } from "@/components/layout/MainLayout";
import { TopBar } from "@/components/layout/TopBar";
import type { BudgetMeta, SavedBudget } from "@/orcamentos/domain";
import { pool } from "@/lib/db";
import { promises as fs } from "fs";
import path from "node:path";
import Link from "next/link";

interface ListedBudget {
  id: string;
  createdAt: string;
  updatedAt: string;
  meta: BudgetMeta;
  codigoInternoObra?: string;
  total: number;
}

async function loadBudgetsFromDb(): Promise<ListedBudget[]> {
  const client = await pool.connect();
  try {
    const result = await client.query<{
      id: string;
      created_at: string;
      updated_at: string;
      codigo_interno_obra: string | null;
      meta: BudgetMeta;
      total: string | number | null;
    }>(
      `
        select
          b.id,
          b.created_at,
          b.updated_at,
          b.codigo_interno_obra,
          b.meta,
          coalesce(sum(i.quantity * i.unit_price), 0) as total
        from budgets b
        left join budget_items i on i.budget_id = b.id
        group by b.id
        order by b.created_at desc
      `,
    );

    return result.rows.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      meta: row.meta,
      codigoInternoObra: row.codigo_interno_obra ?? undefined,
      total: Number(row.total ?? 0),
    }));
  } finally {
    client.release();
  }
}

async function walkSavedBudgetsDir(dir: string): Promise<string[]> {
  const files: string[] = [];

  let names: string[] = [];
  try {
    names = await fs.readdir(dir, { withFileTypes: false } as any);
  } catch {
    return files;
  }

  for (const name of names) {
    const fullPath = path.join(dir, name);
    if (name.endsWith(".json")) {
      files.push(fullPath);
      continue;
    }
    try {
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        const child = await walkSavedBudgetsDir(fullPath);
        files.push(...child);
      }
    } catch {
      // Ignorar erros ao descer subpastas.
    }
  }

  return files;
}

async function loadBudgetsFromFiles(): Promise<ListedBudget[]> {
  const baseDir = path.join(process.cwd(), "data/orcamentos/saved");
  const files = await walkSavedBudgetsDir(baseDir);
  const budgets: ListedBudget[] = [];

  for (const filePath of files) {
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as SavedBudget;
      const total = parsed.items.reduce(
        (sum, it) => sum + it.quantity * it.unitPrice,
        0,
      );
      budgets.push({
        id: parsed.id,
        createdAt: parsed.createdAt,
        updatedAt: parsed.updatedAt,
        meta: parsed.meta,
        codigoInternoObra: parsed.meta.codigoInternoObra,
        total,
      });
    } catch {
      // Ignorar ficheiros inválidos/corrompidos.
    }
  }

  budgets.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return budgets;
}

async function loadBudgets(): Promise<ListedBudget[]> {
  // Em ambientes com acesso ao Supabase (Vercel), usamos a BD.
  // Na VM, se não houver saída para a internet, fazemos fallback para os ficheiros JSON locais.
  try {
    return await loadBudgetsFromDb();
  } catch {
    return await loadBudgetsFromFiles();
  }
}

export default async function OrcamentosGuardadosPage() {
  const budgets = await loadBudgets();

  return (
    <MainLayout>
      <TopBar title="Orçamentos guardados" />

      <main className="rounded-2xl bg-white/80 p-8 shadow-sm ring-1 ring-slate-100">
        <header className="mb-6 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Orçamentos guardados
          </h1>
          <p className="max-w-3xl text-sm text-slate-500">
            Consulta rápida aos orçamentos já gravados na base de dados local.
          </p>
        </header>

        <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-4 text-xs text-slate-500">
            <span>
              A mostrar{" "}
              <span className="font-medium text-slate-700">
                {budgets.length}
              </span>{" "}
              orçamentos.
            </span>
          </div>

          <div className="max-h-[32rem] overflow-auto rounded-lg border border-slate-100">
            <table className="min-w-full border-collapse text-left text-xs">
              <thead className="bg-slate-50">
                <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2">
                    Título
                  </th>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2">
                    Cliente
                  </th>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2">
                    Obra
                  </th>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2">
                    Cód. interno
                  </th>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2">
                    Criado em
                  </th>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-right">
                    Total
                  </th>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-right">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {budgets.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-6 text-center text-[11px] text-slate-400"
                    >
                      Ainda não existem orçamentos gravados. Crie um novo
                      orçamento e utilize o botão &quot;Gravar orçamento&quot;.
                    </td>
                  </tr>
                ) : (
                  budgets.map((b) => (
                    <tr
                      key={b.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                    >
                      <td className="max-w-xs px-3 py-2 text-[11px] text-slate-800">
                        {b.meta.tituloProposta || "Proposta de orçamento"}
                      </td>
                      <td className="max-w-xs px-3 py-2 text-[11px] text-slate-700">
                        {b.meta.clienteNome || "—"}
                      </td>
                      <td className="max-w-xs px-3 py-2 text-[11px] text-slate-700">
                        {b.meta.obraNome || "—"}
                      </td>
                      <td className="max-w-xs px-3 py-2 text-[11px] text-slate-700">
                        {b.codigoInternoObra || b.meta.codigoInternoObra || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-[11px] text-slate-500">
                        {new Date(b.createdAt).toLocaleDateString("pt-PT")}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
                        {b.total.toLocaleString("pt-PT", {
                          style: "currency",
                          currency: "EUR",
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right text-[11px]">
                        <Link
                          href={`/orcamentos/${b.id}`}
                          className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </MainLayout>
  );
}

