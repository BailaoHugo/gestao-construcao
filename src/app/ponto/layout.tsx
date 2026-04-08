import { MainLayout } from "@/components/layout/MainLayout";

export default function PontoLayout({
  children,
  }: {
    children: React.ReactNode;
    }) {
      return <MainLayout>{children}</MainLayout>;
      }