"use client";

import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useContext,
  useState,
} from "react";
import type { BudgetMeta, DraftBudgetItem } from "./domain";

export type DraftItem = DraftBudgetItem;

function createDefaultMeta(): BudgetMeta {
  const today = new Date();
  const iso = today.toISOString().slice(0, 10);
  return {
    tituloProposta: "Proposta de orçamento",
    clienteNome: "",
    clienteEntidade: "",
    clienteContacto: "",
    obraNome: "",
    obraEndereco: "",
    obraReferencia: "",
    dataProposta: iso,
    validadeDias: 30,
    responsavelNome: "",
    responsavelFuncao: "",
    responsavelEmail: "",
    responsavelTelefone: "",
    notasResumo: "",
  };
}

interface BudgetDraftContextValue {
  items: DraftItem[];
  setItems: Dispatch<SetStateAction<DraftItem[]>>;
  meta: BudgetMeta;
  setMeta: Dispatch<SetStateAction<BudgetMeta>>;
  saving: boolean;
  lastSavedId?: string;
  save: () => Promise<void>;
}

const BudgetDraftContext = createContext<BudgetDraftContextValue | null>(null);

export function BudgetDraftProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<DraftItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [lastSavedId, setLastSavedId] = useState<string | undefined>();
  const [meta, setMeta] = useState<BudgetMeta>(() => createDefaultMeta());

  async function save() {
    if (!items.length || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/orcamentos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items,
          meta,
        }),
      });

      if (!res.ok) {
        console.error("Failed to save orçamento", await res.text());
        return;
      }

      const data = (await res.json()) as { id?: string };
      if (data.id) {
        setLastSavedId(data.id);
      }
    } catch (err) {
      console.error("Error saving orçamento", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <BudgetDraftContext.Provider
      value={{
        items,
        setItems,
        meta,
        setMeta,
        saving,
        lastSavedId,
        save,
      }}
    >
      {children}
    </BudgetDraftContext.Provider>
  );
}

export function useBudgetDraft() {
  const ctx = useContext(BudgetDraftContext);
  if (!ctx) {
    throw new Error("useBudgetDraft must be used within BudgetDraftProvider");
  }
  return ctx;
}

