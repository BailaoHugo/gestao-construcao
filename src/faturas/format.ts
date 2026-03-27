export function fmtEur(value: number): string {
  return value.toLocaleString('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  });
}

export function fmtData(iso: string | null | undefined): string {
  if (!iso) return '–';
  const s = String(iso);
  const d = new Date(s.includes('T') ? s : s + 'T00:00:00');
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('pt-PT');
}

export function fmtEstado(estado: string): { label: string; bg: string; text: string } {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    RASCUNHO: { label: 'Rascunho', bg: '#f3f4f6', text: '#6b7280' },
    EMITIDA:  { label: 'Emitida',  bg: '#dbeafe', text: '#1d4ed8' },
    PAGA:     { label: 'Paga',     bg: '#dcfce7', text: '#15803d' },
  };
  return map[estado] ?? { label: estado, bg: '#f3f4f6', text: '#333333' };
}

export function fmtTipo(tipo: string, numeroAuto: number | null): string {
  if (tipo === 'adjudicacao') return 'Adjudicação';
  if (tipo === 'auto') return `Auto nº ${numeroAuto}`;
  return tipo;
}
