import Link from "next/link";
import type { ReactNode } from "react";

const ICON_VARIANTS = {
  emerald: "bg-emerald-50 text-emerald-600",
  blue: "bg-blue-50 text-blue-600",
  violet: "bg-violet-50 text-violet-600",
  amber: "bg-amber-50 text-amber-600",
} as const;

type ModuleCardProps = {
  title: string;
  description: string;
  actionLabel: string;
  href?: string;
  icon?: ReactNode;
  /** Cor do ícone por módulo (emerald, blue, violet, amber) */
  iconVariant?: keyof typeof ICON_VARIANTS;
  disabled?: boolean;
};

export function ModuleCard({
  title,
  description,
  actionLabel,
  href,
  icon,
  iconVariant = "emerald",
  disabled,
}: ModuleCardProps) {
  const iconClasses = ICON_VARIANTS[iconVariant];
  const content = (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-100 bg-white px-6 py-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconClasses}`}
        >
          {icon ?? <span className="text-xl">+</span>}
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <div className="mt-5">
        <button
          className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          disabled={disabled || !href}
          type="button"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className="block h-full">
        {content}
      </Link>
    );
  }

  return content;
}

