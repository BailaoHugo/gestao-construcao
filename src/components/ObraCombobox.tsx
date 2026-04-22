'use client';
import { useState, useRef, useEffect } from 'react';

interface Obra {
  id: string;
  code: string;
  nome: string;
}

interface ObraComboboxProps {
  obras: Obra[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  className?: string;
  emptyLabel?: string;
}

export function ObraCombobox({
  obras,
  value,
  onChange,
  placeholder = 'Pesquisar obra...',
  className = '',
  emptyLabel = 'Todos os centros',
}: ObraComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedObra = obras.find(o => o.id === value);
  const displayText = value && selectedObra
    ? `${selectedObra.code} — ${selectedObra.nome}`
    : '';

  const filtered = query.trim()
    ? obras.filter(o =>
        `${o.code} ${o.nome}`.toLowerCase().includes(query.toLowerCase())
      )
    : obras;

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const handleOpen = () => {
    setOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        onClick={handleOpen}
        className="border rounded px-3 py-1.5 text-sm cursor-pointer bg-white flex items-center justify-between gap-2"
        style={{ minWidth: 180 }}
      >
        <span className={displayText ? 'text-gray-900 truncate' : 'text-gray-400'}>
          {displayText || emptyLabel}
        </span>
        <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg"
             style={{ minWidth: 220, width: '100%' }}>
          <div className="p-2 border-b">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full border rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <ul className="overflow-y-auto" style={{ maxHeight: 200 }}>
            <li
              onClick={() => handleSelect('')}
              className="px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 cursor-pointer"
            >
              {emptyLabel}
            </li>
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400 italic">Sem resultados</li>
            ) : (
              filtered.map(o => (
                <li
                  key={o.id}
                  onClick={() => handleSelect(o.id)}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${
                    value === o.id ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <span className="font-mono font-medium">{o.code}</span>
                  <span className="text-gray-400"> — </span>
                  {o.nome}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
