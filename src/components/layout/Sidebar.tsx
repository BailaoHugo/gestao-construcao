"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/", label: "Dashboard", abbr: "⌂", exact: true },
  { href: "/propostas", label: "Propostas", abbr: "PR" },
  { href: "/obras", label: "Obras", abbr: "OB" },
  { href: "/clientes", label: "Clientes", abbr: "CL" },
  { href: "/contratos", label: "Contratos", abbr: "CO" },
  { href: "/catalogo", label: "Catálogo", abbr: "CT" },
  { href: "/despesas", label: "Despesas", abbr: "DE" },
  { href: "/controlo-obra", label: "Controlo Obra", abbr: "🏗" },
  { href: "/vendas", label: "Vendas", abbr: "VD" },
  { href: "/ponto", label: "Ponto", abbr: "PT" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored !== null) setCollapsed(stored === "true");
    setMounted(true);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      localStorage.setItem("sidebar-collapsed", String(!prev));
      return !prev;
    });
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  // Avoid hydration mismatch — render expanded on server
  const isCollapsed = mounted && collapsed;

  return (
    <aside
      className={`no-print hidden md:flex flex-col shrink-0 transition-all duration-200 ${
        isCollapsed ? "w-14" : "w-52"
      }`}
    >
      <nav className="sticky top-6 flex flex-col gap-1 rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-slate-100">
        {/* Header */}
        <div
          className={`mb-2 px-1 pt-1 pb-3 border-b border-slate-100 ${
            isCollapsed ? "flex justify-center" : ""
          }`}
        >
          {isCollapsed ? (
            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              GO
            </span>
          ) : (
            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              Gestão de Obra
            </p>
          )}
        </div>

        {/* Nav items */}
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={`flex items-center rounded-xl px-2 py-2.5 text-sm font-medium transition-colors ${
                isCollapsed ? "justify-center gap-0" : "gap-3"
              } ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${
                  active
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {item.abbr}
              </span>
              {!isCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </Link>
          );
        })}

        {/* Logout + Toggle */}
        <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1">
          <button
            onClick={handleLogout}
            title={isCollapsed ? "Sair" : undefined}
            className={`flex w-full items-center rounded-xl px-2 py-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors ${
              isCollapsed ? "justify-center" : "gap-2"
            }`}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-bold text-slate-500">
              ⏻
            </span>
            {!isCollapsed && <span className="text-xs font-medium">Sair</span>}
          </button>
          <button
            onClick={toggle}
            title={isCollapsed ? "Expandir menu" : "Colapsar menu"}
            className={`flex w-full items-center rounded-xl px-2 py-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors ${
              isCollapsed ? "justify-center" : "gap-2"
            }`}
          >
            <span className="text-sm font-bold leading-none">
              {isCollapsed ? "›" : "‹"}
            </span>
            {!isCollapsed && (
              <span className="text-xs">Colapsar</span>
            )}
          </button>
        </div>
      </nav>
    </aside>
  );
}
