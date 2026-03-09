import { Suspense } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { BudgetDraftProvider } from "@/orcamentos/BudgetDraftContext";
import { FolhaRostoForm } from "@/orcamentos/FolhaRostoForm";
import { ImportHydrator, EditHydrator } from "@/orcamentos/NovoOrcamentoWithImport";
import { NovoOrcamentoHeader } from "@/orcamentos/NovoOrcamentoHeader";
import { OrcamentoBuilder } from "@/orcamentos/OrcamentoBuilder";

export default function NovoOrcamentoPage() {
  return (
    <MainLayout>
      <BudgetDraftProvider>
        <Suspense fallback={null}>
          <ImportHydrator />
          <EditHydrator />
        </Suspense>
        <NovoOrcamentoHeader />

        <main className="mt-6 rounded-2xl bg-white/80 p-8 shadow-sm ring-1 ring-slate-100 print-page">
          <header className="mb-6 space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Novo orçamento
            </h1>
            <p className="max-w-3xl text-sm text-slate-500">
              Crie o orçamento usando o catálogo hierárquico à esquerda,
              comandos no centro e o preview normalizado à direita.
            </p>
          </header>

          <div className="space-y-6">
            <FolhaRostoForm />
            <OrcamentoBuilder />
          </div>
        </main>
      </BudgetDraftProvider>
    </MainLayout>
  );
}

