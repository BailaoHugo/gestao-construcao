type TopBarProps = {
  title?: string;
};

export function TopBar({ title = "Gestão Construção" }: TopBarProps) {
  return (
    <header className="no-print flex items-center rounded-xl bg-white/80 px-6 py-4 shadow-sm ring-1 ring-slate-100">
      <h1 className="text-sm font-semibold tracking-wide text-slate-800">
        {title}
      </h1>
    </header>
  );
}
