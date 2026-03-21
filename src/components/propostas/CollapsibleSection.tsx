"use client";

import { useState, type ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: ReactNode;
  /** Por defeito visível */
  defaultOpen?: boolean;
  /** Botões extra à direita do título (ex.: largura total) */
  headerActions?: ReactNode;
  children: ReactNode;
};

export function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = true,
  headerActions,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-xl border border-slate-100 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {subtitle != null && subtitle !== "" ? (
            <div className="mt-0.5 text-[11px] text-slate-500">{subtitle}</div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {headerActions}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-700 transition hover:bg-slate-100"
            aria-expanded={open}
          >
            {open ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      </div>
      {open ? (
        <div className="border-t border-slate-100 p-4 pt-4">{children}</div>
      ) : null}
    </section>
  );
}
