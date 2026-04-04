"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard", abbr: "⌂", exact: true },
  { href: "/propostas", label: "Propostas", abbr: "PR" },
  { href: "/obras", label: "Obras", abbr: "OB" },
  { href: "/contratos", label: "Contratos", abbr: "CO" },
  { href: "/orcamentos", label: "Orçamentos", abbr: "OR" },
  { href: "/catalogo", label: "Catálogo", abbr: "CT" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="no-print hidden md:block w-52 shrink-0">
      <nav className="sticky top-6 flex flex-col gap-1 rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-slate-100">
        <div className="mb-2 px-3 pt-1 pb-3 border-b border-slate-100">
          <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
            Gestão de Obra
          </p>
        </div>
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${
                  active
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {item.abbr}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
