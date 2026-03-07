"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useBudgetDraft } from "./BudgetDraftContext";
import type { DraftBudgetItem } from "./domain";

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
