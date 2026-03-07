"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import type { BudgetStatus } from "@/orcamentos/domain";
import {
  BUDGET_STATUS_LABEL,
  getStatusClasses,
  getStatusLabel,
} from "@/orcamentos/status";

const STATUS_OPTIONS: BudgetStatus[] = ["EM_EXECUCAO", "EM_ANALISE", "APROVADO"];

interface BudgetStatusSelectProps {
  budgetId: string;
  initialStatus: BudgetStatus | undefined;
}

export function BudgetStatusSelect({
  budgetId,
  initialStatus,
}: BudgetStatusSelectProps) {
  const router = useRouter();
  const [status, setStatus] = useState<BudgetStatus | undefined>(
    initialStatus ?? "EM_EXECUCAO",
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value as BudgetStatus;
      setStatus(value);
      setFeedback(null);
      try {
        const res = await fetch(`/api/orcamentos/${budgetId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: value }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setFeedback(data.error ?? "Erro ao atualizar");
          setStatus(initialStatus ?? "EM_EXECUCAO");
          return;
        }
        setFeedback("Estado atualizado");
        router.refresh();
      } catch {
        setFeedback("Erro de rede");
        setStatus(initialStatus ?? "EM_EXECUCAO");
      }
    },
    [budgetId, initialStatus, router],
  );

  return (
    <div className="flex items-center gap-2">
      <span className={getStatusClasses(status)}>
        {getStatusLabel(status)}
      </span>
      <select
        value={status ?? "EM_EXECUCAO"}
        onChange={handleChange}
        className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300"
        aria-label="Alterar estado do orçamento"
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {BUDGET_STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      {feedback && (
        <span className="text-[10px] text-slate-500">{feedback}</span>
      )}
    </div>
  );
}
