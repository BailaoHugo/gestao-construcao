"use client";

import { useState } from "react";
import {
  parseImportedLines,
  type ParsedImportedLine,
} from "@/lib/propostas/parseImportedLines";

type Props = {
  open: boolean;
  onClose: () => void;
  onInsert: (linhas: ParsedImportedLine[]) => void;
};

export function ImportarLinhasModal({ open, onClose, onInsert }: Props) {
  const [rawText, setRawText] = useState("");
  const [preview, setPreview] = useState<ParsedImportedLine[]>([]);
  const [hasPreview, setHasPreview] = useState(false);

  if (!open) return null;

  const handlePreview = () => {
    const result = parseImportedLines(rawText);
    setPreview(result);
    setHasPreview(true);
  };

  const hasErrors = preview.some((l) => !l.isValid);
  const hasValid = preview.some((l) => l.isValid);

  const handleInsert = () => {
    const valid = preview.filter((l) => l.isValid);
    if (valid.length === 0) return;
    onInsert(valid);
    setRawText("");
    setPreview([]);
    setHasPreview(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Importar linhas
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] text-slate-500 hover:text-slate-700"
          >
            Fechar
          </button>
        </div>

        <div className="grid max-h-[70vh] gap-4 overflow-y-auto px-4 py-4 md:grid-cols-2">
          <div className="space-y-2 text-xs text-slate-700">
            <label className="block text-[11px] font-medium text-slate-700">
              Colar linhas (Excel ou texto com |)
            </label>
            <textarea
              className="h-56 w-full resize-none rounded border border-slate-200 p-2 text-[11px] text-slate-800 outline-none focus:border-slate-400"
              placeholder="Descrição[TAB]Unidade[TAB]Quantidade[TAB]PU&#10;ou&#10;Descrição | Unidade | Quantidade | PU"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
            <button
              type="button"
              onClick={handlePreview}
              className="rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-slate-800"
            >
              Pré-visualizar
            </button>
          </div>

          <div className="space-y-2 text-xs text-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-700">
                Pré-visualização
              </span>
              <button
                type="button"
                onClick={handleInsert}
                disabled={!hasPreview || hasErrors || !hasValid}
                className={`rounded-full px-3 py-1.5 text-[11px] font-medium ${
                  !hasPreview || hasErrors || !hasValid
                    ? "cursor-not-allowed bg-slate-200 text-slate-400"
                    : "bg-emerald-600 text-white hover:bg-emerald-500"
                }`}
              >
                Inserir linhas
              </button>
            </div>

            <div className="max-h-60 overflow-auto rounded border border-slate-200">
              {!hasPreview ? (
                <div className="px-3 py-4 text-[11px] text-slate-400">
                  Cole o conteúdo e clique em &quot;Pré-visualizar&quot;.
                </div>
              ) : preview.length === 0 ? (
                <div className="px-3 py-4 text-[11px] text-slate-400">
                  Nenhuma linha encontrada.
                </div>
              ) : (
                <table className="min-w-full border-collapse text-[11px]">
                  <thead className="bg-slate-50">
                    <tr className="text-[10px] uppercase tracking-wide text-slate-500">
                      <th className="px-2 py-1 text-left">#</th>
                      <th className="px-2 py-1 text-left">Descrição</th>
                      <th className="px-2 py-1 text-left">Unid.</th>
                      <th className="px-2 py-1 text-right">Qtd.</th>
                      <th className="px-2 py-1 text-right">PU Venda</th>
                      <th className="px-2 py-1 text-right">Total Venda</th>
                      <th className="px-2 py-1 text-right">PU Custo</th>
                      <th className="px-2 py-1 text-right">Total Custo</th>
                      <th className="px-2 py-1 text-left">Capítulo</th>
                      <th className="px-2 py-1 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((linha, idx) => (
                      <tr
                        key={`${idx}-${linha.rawLine}`}
                        className="border-t border-slate-100"
                      >
                        <td className="px-2 py-1 align-top text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="px-2 py-1 align-top text-slate-800">
                          {linha.descricao}
                        </td>
                        <td className="px-2 py-1 align-top text-slate-800">
                          {linha.unidade ?? "—"}
                        </td>
                        <td className="px-2 py-1 align-top text-right text-slate-800">
                          {linha.quantidade ?? "—"}
                        </td>
                        <td className="px-2 py-1 align-top text-right text-slate-800">
                          {linha.preco_venda_unitario ?? "—"}
                        </td>
                        <td className="px-2 py-1 align-top text-right text-slate-800">
                          {linha.total_venda_linha ?? "—"}
                        </td>
                        <td className="px-2 py-1 align-top text-right text-slate-800">
                          {linha.preco_custo_unitario ?? "—"}
                        </td>
                        <td className="px-2 py-1 align-top text-right text-slate-800">
                          {linha.total_custo_linha ?? "—"}
                        </td>
                        <td className="px-2 py-1 align-top text-slate-800">
                          {linha.capitulo ?? "—"}
                        </td>
                        <td className="px-2 py-1 align-top">
                          {linha.isValid ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                              OK
                            </span>
                          ) : (
                            <span className="text-[10px] text-red-600">
                              {linha.error}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

