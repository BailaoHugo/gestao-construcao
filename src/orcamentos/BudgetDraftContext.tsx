"use client";

import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useContext,
  useMemo,
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
    obraNumero: "",
    obraReferencia: "",
    dataProposta: iso,
    validadeDias: 30,
    responsavelNome: "",
    responsavelFuncao: "",
    responsavelEmail: "",
    responsavelTelefone: "",
    notasResumo: "",
    codigoInternoObra: "",
  };
}

function normalizeForSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildCodigoInterno(meta: BudgetMeta): string {
  const datePart = (meta.dataProposta || "").replace(/-/g, "");
  const numero = meta.obraNumero?.trim() || "s-numero";
  const slugNome = normalizeForSlug(meta.obraNome || "sem-nome");
  const safeNumero = normalizeForSlug(numero) || "s-numero";
  return [datePart || "s-data", safeNumero, slugNome].join("-");
}

interface BudgetDraftContextValue {
  items: DraftItem[];
  setItems: Dispatch<SetStateAction<DraftItem[]>>;
  meta: BudgetMeta;
  setMeta: Dispatch<SetStateAction<BudgetMeta>>;
  saving: boolean;
  lastSavedId?: string;
  saveError?: string;
  save: () => Promise<void>;
}

const BudgetDraftContext = createContext<BudgetDraftContextValue | null>(null);

export function BudgetDraftProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<DraftItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [lastSavedId, setLastSavedId] = useState<string | undefined>();
  const [saveError, setSaveError] = useState<string | undefined>();
  const [metaState, setMetaState] = useState<BudgetMeta>(() => createDefaultMeta());

  const meta = useMemo<BudgetMeta>(() => {
    const codigoInternoObra = buildCodigoInterno(metaState);
    if (metaState.codigoInternoObra === codigoInternoObra) return metaState;
    return { ...metaState, codigoInternoObra };
  }, [metaState]);

  const setMeta: Dispatch<SetStateAction<BudgetMeta>> = (updater) => {
    setMetaState((current) => {
      const next = typeof updater === "function" ? (updater as (prev: BudgetMeta) => BudgetMeta)(current) : updater;
      return next;
    });
  };

  async function save() {
    if (!items.length || saving) return;
    setSaving(true);
    setSaveError(undefined);
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
        const text = await res.text();
        console.error("Failed to save orçamento", res.status, text);
        let message = `Erro ${res.status}. `;
        try {
          const json = JSON.parse(text) as { error?: string };
          if (json.error) message = json.error;
          else message += text.slice(0, 100) || "Sem detalhes.";
        } catch {
          if (res.status === 503) message = "Base de dados indisponível. Verifique DATABASE_URL (ex.: na Vercel).";
          else message += text.slice(0, 120) || "Sem detalhes.";
        }
        setSaveError(message);
        return;
      }

      const data = (await res.json()) as { id?: string };
      if (data.id) {
        setLastSavedId(data.id);
      }
    } catch (err) {
      console.error("Error saving orçamento", err);
      setSaveError("Erro de rede ao gravar. Tente novamente.");
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
        saveError,
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

