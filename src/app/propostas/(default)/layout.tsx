import { MainLayout } from "@/components/layout/MainLayout";
import { TopBar } from "@/components/layout/TopBar";

export default function PropostasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MainLayout>
      <TopBar title="Propostas" />
      <main className="rounded-2xl bg-white/80 p-8 shadow-sm ring-1 ring-slate-100">
        {children}
      </main>
    </MainLayout>
  );
}

