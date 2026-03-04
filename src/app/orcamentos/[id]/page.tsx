import { MainLayout } from "@/components/layout/MainLayout";
import { PrintButton } from "@/components/PrintButton";
import type {
  BudgetMeta,
  DraftBudgetItem,
  SavedBudget,
} from "@/orcamentos/domain";
import { pool } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";

async function loadBudget(id: string): Promise<SavedBudget | null> {
  const client = await pool.connect();
  try {
    const budgetResult = await client.query<{
      id: string;
      created_at: string;
      updated_at: string;
      meta: BudgetMeta;
    }>(
      `
        select id, created_at, updated_at, meta
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

    const itemsResult = await client.query<ItemRow>(
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

    const items: DraftBudgetItem[] = itemsResult.rows.map(
      (row: ItemRow): DraftBudgetItem => ({
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
      kAplicado:
        row.k_aplicado !== null ? Number(row.k_aplicado) : undefined,
      grandeCapituloCode: "",
      capituloCode: "",
    }),
    );

    const budget: SavedBudget = {
      id: budgetRow.id,
      createdAt: budgetRow.created_at,
      updatedAt: budgetRow.updated_at,
      items,
      meta: budgetRow.meta,
    };

    return budget;
  } finally {
    client.release();
  }
}

export default async function OrcamentoDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const budget = await loadBudget(params.id);

  if (!budget) {
    notFound();
  }

  const totalGlobal = budget.items.reduce(
    (sum, it) => sum + it.quantity * it.unitPrice,
    0,
  );

  return (
    <MainLayout>
      <main className="mt-4 space-y-4">
        <div className="no-print flex items-center justify-between rounded-xl bg-white/80 px-6 py-3 shadow-sm ring-1 ring-slate-100">
          <div className="space-y-0.5 text-xs text-slate-700">
            <div className="font-semibold text-slate-900">
              Proposta / orçamento
            </div>
            <div className="text-[11px] text-slate-500">
              ID:{" "}
              <span className="font-mono text-[10px]">{budget.id}</span>{" "}
              · Criado em{" "}
              {new Date(budget.createdAt).toLocaleString("pt-PT")}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/orcamentos/guardados"
              className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Voltar à lista
            </Link>
            <PrintButton />
          </div>
        </div>

        <section className="print-page mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
          {/* Folha de rosto */}
          <header className="mb-10 border-b border-slate-200 pb-6">
            <div className="mb-4 text-xs uppercase tracking-wide text-slate-500">
              Proposta comercial
            </div>
            <h1 className="mb-2 text-2xl font-semibold tracking-tight text-slate-900">
              {budget.meta.tituloProposta || "Proposta de orçamento"}
            </h1>
            {budget.meta.codigoInternoObra && (
              <div className="text-xs text-slate-600">
                Código interno:{" "}
                <span className="font-mono">
                  {budget.meta.codigoInternoObra}
                </span>
              </div>
            )}

            <div className="mt-4 grid gap-6 md:grid-cols-2 text-sm text-slate-800">
              <div className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Cliente
                </h2>
                <div>
                  <div className="font-medium">
                    {budget.meta.clienteNome || "—"}
                  </div>
                  {budget.meta.clienteEntidade && (
                    <div className="text-slate-600">
                      {budget.meta.clienteEntidade}
                    </div>
                  )}
                  {budget.meta.clienteContacto && (
                    <div className="mt-1 text-xs text-slate-600">
                      {budget.meta.clienteContacto}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Obra
                </h2>
                <div>
                  <div className="font-medium">
                    {budget.meta.obraNome || "—"}
                  </div>
                  {budget.meta.obraEndereco && (
                    <div className="text-slate-600">
                      {budget.meta.obraEndereco}
                    </div>
                  )}
                  {budget.meta.obraReferencia && (
                    <div className="mt-1 text-xs text-slate-600">
                      Ref.: {budget.meta.obraReferencia}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Proposta
                </h2>
                <div className="text-xs text-slate-700">
                  <div>
                    <span className="font-medium">Data da proposta: </span>
                    {budget.meta.dataProposta || "—"}
                  </div>
                  <div>
                    <span className="font-medium">Validade: </span>
                    {budget.meta.validadeDias > 0
                      ? `${budget.meta.validadeDias} dias`
                      : "—"}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Responsável
                </h2>
                <div className="text-xs text-slate-700">
                  <div className="font-medium">
                    {budget.meta.responsavelNome || "—"}
                  </div>
                  {budget.meta.responsavelFuncao && (
                    <div>{budget.meta.responsavelFuncao}</div>
                  )}
                  {budget.meta.responsavelEmail && (
                    <div className="mt-1">{budget.meta.responsavelEmail}</div>
                  )}
                  {budget.meta.responsavelTelefone && (
                    <div>{budget.meta.responsavelTelefone}</div>
                  )}
                </div>
              </div>
            </div>

            {budget.meta.notasResumo && (
              <div className="mt-6 rounded-md bg-slate-50 px-4 py-3 text-xs text-slate-700">
                {budget.meta.notasResumo}
              </div>
            )}
          </header>

          {/* Corpo do orçamento */}
          <section className="space-y-4">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                Quadro de preços
              </h2>
              <div className="text-sm text-slate-800">
                Total proposta:{" "}
                <span className="font-semibold">
                  {totalGlobal.toLocaleString("pt-PT", {
                    style: "currency",
                    currency: "EUR",
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="min-w-full border-collapse text-left text-xs">
                <thead className="bg-slate-50">
                  <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="border-b border-slate-200 px-3 py-2">
                      Código
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2">
                      Descrição
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2 text-right">
                      Qtd.
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2">
                      Unid.
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2 text-right">
                      Preço unitário
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2 text-right">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {budget.items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-6 text-center text-[11px] text-slate-400"
                      >
                        Este orçamento não tem linhas registadas.
                      </td>
                    </tr>
                  ) : (
                    budget.items.map((it) => {
                      const totalLinha = it.quantity * it.unitPrice;
                      const precoVenda =
                        it.precoVendaUnitario ?? it.unitPrice;

                      return (
                        <tr
                          key={it.rowId}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-slate-800">
                            {it.code}
                          </td>
                          <td className="max-w-md px-3 py-2 text-[11px] text-slate-800">
                            {it.description}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
                            {it.quantity.toLocaleString("pt-PT", {
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-[11px] text-slate-700">
                            {it.unit}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
                            {precoVenda.toLocaleString("pt-PT", {
                              style: "currency",
                              currency: "EUR",
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
                            {totalLinha.toLocaleString("pt-PT", {
                              style: "currency",
                              currency: "EUR",
                              minimumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </main>
    </MainLayout>
  );
}

