"use client";
import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { TopBar } from "@/components/layout/TopBar";
import Link from "next/link";

type Metrics = {
  clientes: number;
  obras: number;
  propostas: number;
  contratos: number;
};

const CARDS = [
  { key: "clientes",  label: "Clientes",  href: "/clientes",  color: "bg-blue-50 text-blue-700",   icon: "👥" },
  { key: "obras",     label: "Obras",     href: "/obras",     color: "bg-amber-50 text-amber-700",  icon: "🏗️" },
  { key: "propostas", label: "Propostas", href: "/propostas", color: "bg-purple-50 text-purple-700", icon: "📄" },
  { key: "contratos", label: "Contratos", href: "/contratos", color: "bg-rose-50 text-rose-700",    icon: "📝" },
] as const;

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => { setMetrics(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <MainLayout>
      <TopBar title="Dashboard" />
      <main className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {CARDS.map(({ key, label, href, color, icon }) => (
            <Link
              key={key}
              href={href}
              className="group flex flex-col gap-2 rounded-2xl bg-white/80 p-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md hover:ring-slate-200"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${color}`}>
                {icon}
              </div>
              <div className="mt-1 text-2xl font-bold text-slate-800">
                {loading ? (
                  <span className="inline-block h-7 w-10 animate-pulse rounded bg-slate-100" />
                ) : (
                  (metrics?.[key as keyof Metrics] ?? 0)
                )}
              </div>
              <div className="text-xs font-medium text-slate-500 group-hover:text-slate-700">{label}</div>
            </Link>
          ))}
        </div>

        <div className="rounded-2xl bg-white/80 p-8 shadow-sm ring-1 ring-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">Bem-vindo à Gestão de Obra</h2>
          <p className="mt-2 text-sm text-slate-500">
            Usa a barra lateral para navegar entre os módulos. Os cards acima mostram os totais actuais em tempo real.
          </p>
          {metrics && metrics.clientes > 0 && metrics.obras === 0 && (
            <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-100">
              💡 Tens <strong>{metrics.clientes} clientes</strong> importados. O próximo passo é criar obras e associá-las a clientes.
            </div>
          )}
        </div>
      </main>
    </MainLayout>
  );
}
