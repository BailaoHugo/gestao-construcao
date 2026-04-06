import { MainLayout } from "@/components/layout/MainLayout";

export default function DespesasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
