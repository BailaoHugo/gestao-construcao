"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useBudgetDraft } from "./BudgetDraftContext";
import type { BudgetMeta, DraftBudgetItem, SavedBudget } from "./domain";

const STORAGE_KEY = "orcamento-import-draft";

interface StoredImport {
  items: DraftBudgetItem[];
}

/** Dentro de BudgetDraftProvider: carrega dados da importação quando ?fromImport=1 */
export function ImportHydrator() {
  const searchParams = useSearchParams();
  const { setItems } = useBudgetDraft();

  useEffect(() => {
    if (searchParams.get("fromImport") !== "1") return;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as StoredImport;
      if (!Array.isArray(data.items) || data.items.length === 0) return;
      setItems(data.items);
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, [searchParams, setItems]);

  return null;
}

/** Carrega um orçamento existente para edição quando ?editBudgetId=ID */
export function EditHydrator() {
  const searchParams = useSearchParams();
  const { setItems, setMeta } = useBudgetDraft();

  useEffect(() => {
    const id = searchParams.get("editBudgetId");
    if (!id) return;

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/orcamentos/${id}`, {
          method: "GET",
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as SavedBudget;
        if (cancelled) return;
        if (Array.isArray(data.items) && data.items.length > 0) {
          setItems(
            data.items.map((it) => ({
              ...it,
              // garantir rowId único no cliente
              rowId: it.rowId || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
            })),
          );
        }
        if (data.meta) {
          setMeta((prev: BudgetMeta) => ({
            ...prev,
            ...data.meta,
          }));
        }
      } catch {
        // falha silenciosa: o utilizador pode sempre criar um novo orçamento
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [searchParams, setItems, setMeta]);

  return null;
}
