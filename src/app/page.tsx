import { MainLayout } from "@/components/layout/MainLayout";
import { TopBar } from "@/components/layout/TopBar";
import { ModuleCard } from "@/components/dashboard/ModuleCard";

export default function Home() {
  return (
    <MainLayout>
      <TopBar />

      <main className="rounded-2xl bg-white/80 p-8 shadow-sm ring-1 ring-slate-100">
        <header className="mb-8 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Selecione o módulo da aplicação de gestão de construção que pretende
            utilizar.
          </p>
        </header>

        <section className="grid gap-5 md:grid-cols-3">
          <ModuleCard
            title="Orçamentos"
            description="Criar, importar e consultar orçamentos de obras com seleção hierárquica."
            actionLabel="Abrir módulo"
            href="/orcamentos"
          />

          <ModuleCard
            title="Obras"
            description="Planeamento, acompanhamento e controlo de obras (em breve)."
            actionLabel="Em breve"
            disabled
          />

          <ModuleCard
            title="Clientes"
            description="Gestão de clientes e contactos associados às obras (em breve)."
            actionLabel="Em breve"
            disabled
          />
        </section>
      </main>
    </MainLayout>
  );
}


