import { MainLayout } from "@/components/layout/MainLayout";
import { TopBar } from "@/components/layout/TopBar";
import { ModuleCard } from "@/components/dashboard/ModuleCard";
import Link from "next/link";

export default function ObrasPage() {
  return (
    <MainLayout>
      <TopBar title="Obras" />

      <main className="rounded-2xl bg-white/80 p-8 shadow-sm ring-1 ring-slate-100">
        <header className="mb-8 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Obras
          </h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Planeamento, acompanhamento e controlo de obras. Registo de despesas e facturas.
          </p>
        </header>

        <section className="grid gap-5 md:grid-cols-3">
          <ModuleCard
            title="Registo de despesas"
            description="Registar facturas e despesas: carregar PDF, tirar fotos ou receber por e-mail. Inserir todos os campos da factura."
            actionLabel="Abrir"
            href="/obras/despesas"
            icon={<span className="text-lg font-semibold">📄</span>}
            iconVariant="amber"
          />
        </section>

        <p className="mt-8 text-sm text-slate-500">
          <Link href="/" className="underline hover:no-underline">
            ← Voltar ao Dashboard
          </Link>
        </p>
      </main>
    </MainLayout>
  );
}
