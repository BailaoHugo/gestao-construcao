"use client";

import { useMemo, useState } from "react";
import type { Capitulo, DraftBudgetItem, GrandeCapitulo } from "./domain";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const grandesCapitulos: GrandeCapitulo[] = require("../../data/orcamentos/processed/grandes_capitulos.json");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const capitulos: Capitulo[] = require("../../data/orcamentos/processed/capitulos.json");

const capitulosByGC = capitulos.reduce<Record<string, Capitulo[]>>((acc, c) => {
  if (!acc[c.grandeCapituloCode]) acc[c.grandeCapituloCode] = [];
  acc[c.grandeCapituloCode].push(c);
  return acc;
}, {});

export interface ImportCapituloSelectorProps {
  item: DraftBudgetItem;
  onConfirm: (grandeCapituloCode: string, capituloCode: string) => void;
  onCancel: () => void;
}

export function ImportCapituloSelector({
  item,
  onConfirm,
  onCancel,
}: ImportCapituloSelectorProps) {
  const [gcCode, setGcCode] = useState("");
  const [capCode, setCapCode] = useState("");

  const capsForGc = useMemo(
    () => (gcCode ? capitulosByGC[gcCode] ?? [] : []),
    [gcCode],
  );

  const handleGcChange = (value: string) => {
    setGcCode(value);
    setCapCode("");
  };

  const canSubmit = Boolean(gcCode && capCode);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
      <p className="mb-3 text-xs text-slate-600">
        Atribuir capítulo: <strong>{item.code}</strong> — {item.description}
      </p>
      <div className="space-y-3">
        <label className="block text-xs font-medium text-slate-700">
          Grande capítulo
          <select
            value={gcCode}
            onChange={(e) => handleGcChange(e.target.value)}
            className="mt-1 block w-full rounded border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">— Escolher —</option>
            {grandesCapitulos.map((gc) => (
              <option key={gc.code} value={gc.code}>
                {gc.code} — {gc.description}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-slate-700">
          Capítulo
          <select
            value={capCode}
            onChange={(e) => setCapCode(e.target.value)}
            disabled={!gcCode}
            className="mt-1 block w-full rounded border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
          >
            <option value="">— Escolher —</option>
            {capsForGc.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.description}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => canSubmit && onConfirm(gcCode, capCode)}
          disabled={!canSubmit}
          className="rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          Adicionar ao modelo
        </button>
      </div>
    </div>
  );
}

export { grandesCapitulos, capitulos };
