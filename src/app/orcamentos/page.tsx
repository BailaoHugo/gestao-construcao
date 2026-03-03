import { MainLayout } from "@/components/layout/MainLayout";
import { TopBar } from "@/components/layout/TopBar";
import { ModuleCard } from "@/components/dashboard/ModuleCard";

export default function OrcamentosPage() {
  return (
    <MainLayout>
      <TopBar title="Orçamentos" />

      <main className="rounded-2xl bg-white/80 p-8 shadow-sm ring-1 ring-slate-100">
        <header className="mb-8 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Orçamentos
          </h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Criar orçamentos com seleção hierárquica, quantidades e margens,
            tudo centralizado num único sítio.
          </p>
        </header>

        <section className="grid gap-5 md:grid-cols-3">
          <ModuleCard
            title="Novo orçamento"
            description="Cria folha de rosto, lista de artigos, quantidades, preços e margens tudo num só local."
            actionLabel="Abrir"
            href="/orcamentos/novo"
          />

          <ModuleCard
            title="Importar orçamento"
            description="Importa Excel/CSV existente e normaliza para o modelo interno."
            actionLabel="Importar"
            href="/orcamentos"
          />

          <ModuleCard
            title="Orçamentos guardados"
            description="Consultar orçamentos já gravados e continuar a edição."
            actionLabel="Ver lista"
            href="/orcamentos"
          />

        <ModuleCard
          title="Base de dados"
          description="Consultar o catálogo normalizado de artigos de construção em formato de tabela."
          actionLabel="Ver base de dados"
          href="/orcamentos/base-de-dados"
        />
        </section>
      </main>
    </MainLayout>
  );
}

