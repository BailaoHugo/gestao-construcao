import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

type MainLayoutProps = {
  children: ReactNode;
};

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-surface px-4 py-6 text-slate-900">
      <div className="mx-auto flex max-w-7xl gap-6">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {children}
        </div>
      </div>
    </div>
  );
}
