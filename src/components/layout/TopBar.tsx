import Link from "next/link";

type TopBarProps = {
  title?: string;
};

export function TopBar({ title = "Gestão Construção" }: TopBarProps) {
  return (
    <header className="flex items-center justify-between rounded-xl bg-white/80 px-6 py-4 shadow-sm ring-1 ring-slate-100">
      <div className="text-sm font-semibold tracking-wide text-slate-800">
        {title}
      </div>
      <Link
        href="/"
        className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
      >
        Dashboard
      </Link>
    </header>
  );
}

