"use client";

import Link from "next/link";
import { MainLayout } from "@/components/layout/MainLayout";
import { TopBar } from "@/components/layout/TopBar";

export default function RegistoDespesasPage() {
  return (
    <MainLayout>
      <TopBar title="Registo de despesas" />
      <main className="rounded-2xl bg-white/80 p-8 shadow-sm ring-1 ring-slate-100">
        <h1 className="text-2xl font-semibold text-slate-900">Registo de despesas</h1>
        <p className="mt-2 text-sm text-slate-500">Em construção.</p>
        <p className="mt-8 text-sm text-slate-500">
          <Link href="/obras" className="underline hover:no-underline">Voltar a Obras</Link>
        </p>
      </main>
    </MainLayout>
  );
}
