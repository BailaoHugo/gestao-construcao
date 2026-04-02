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
            title="Catálogo"
            description="Base de dados de artigos, capítulos e códigos do sistema."
            actionLabel="Abrir módulo"
            href="/catalogo"
            icon={<span className="text-xs font-semibold tracking-tight">CT</span>}
            iconVariant="blue"
          />
          <ModuleCard
            title="Propostas"
            description="Criar, guardar, consultar e imprimir propostas comerciais."
            actionLabel="Abrir módulo"
            href="/propostas"
            icon={<span className="text-xs font-semibold tracking-tight">PR</span>}
            iconVariant="blue"
          />
          <ModuleCard
            title="Contratos"
            description="Elaborar e gerir contratos de empreitada e cláusulas contratuais."
            actionLabel="Abrir módulo"
            href="/contratos"
            icon={<span className="text-xs font-semibold tracking-tight">CO</span>}
            iconVariant="blue"
          />
          <ModuleCard
            title="Faturação"
            description="Faturas de adjudicação e autos de medição mensais."
            actionLabel="Abrir módulo"
            href="/faturas"
            icon={<span className="text-xs font-semibold tracking-tight">FT</span>}
            iconVariant="blue"
          />
          <ModuleCard
            title="Controlo de Obra"
            description="Gestão de custos, faturas recebidas, fornecedores e trabalhadores por contrato."
            actionLabel="Abrir módulo"
            href="/controlo-obra"
            icon={<span className="text-xs font-semibold tracking-tight">OB</span>}
            iconVariant="blue"
          />
          <ModuleCard
            title="Clientes"
            description="Lista de clientes sincronizados do TOConline."
            actionLabel="Abrir módulo"
            href="/clientes"
            icon={<span className="text-xs font-semibold tracking-tight">CL</span>}
            iconVariant="blue"
          />
          <ModuleCard
            title="Obras / Centros de Custo"
            description="Gestão de obras e centros de custo: criar, editar e controlar o estado de cada obra."
            actionLabel="Abrir módulo"
            href="/obras"
            icon={<span className="text-xs font-semibold tracking-tight">CC</span>}
            iconVariant="blue"
          />
          <ModuleCard
            title="Fornecedores"
            description="Base de dados de fornecedores e subempreiteiros: criar, editar e ativar/desativar."
            actionLabel="Abrir módulo"
            href="/fornecedores"
            icon={<span className="text-xs font-semibold tracking-tight">FN</span>}
            iconVariant="blue"
          />
        </section>
      </main>
    </MainLayout>
  );
}
