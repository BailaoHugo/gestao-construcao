 "use client";

import React, { useEffect, useMemo, useState } from "react";
import { DataGrid, type Column } from "react-data-grid";
import type {
  ArtigoMaster,
  Capitulo,
  DraftBudgetItem,
  GrandeCapitulo,
} from "./domain";
import { generateNextCodeForCap } from "./codeUtils";

type ExcelRow = {
  id: string;
  gc: string;
  cap: string;
  code: string;
  descricao: string;
  qtd: string;
  k: string;
  unidade: string;
  custoUnit: string;
  pu: string;
  total: string;
  margemPercent: string;
};

interface ExcelLikeImportGridProps {
  artigos: ArtigoMaster[];
  capitulos: Capitulo[];
  grandesCapitulos: GrandeCapitulo[];
  existingItems: DraftBudgetItem[];
  onAddToBudget: (items: DraftBudgetItem[]) => void;
  onStatusChange?: (message: string) => void;
}

function createEmptyRow(): ExcelRow {
  return {
    id: `${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    gc: "",
    cap: "",
    code: "",
    descricao: "",
    qtd: "",
    k: "",
    unidade: "",
    custoUnit: "",
    pu: "",
    total: "",
    margemPercent: "",
  };
}

function parseNum(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/\s/g, "").replace(",", ".");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function recalcAllRows(
  rows: ExcelRow[],
  baseUsedCodes: Set<string>,
  capitulos: Capitulo[],
  validGcCodes: Set<string>,
  validCapCodes: Set<string>,
): ExcelRow[] {
  const used = new Set(baseUsedCodes);
  const firstCap = capitulos[0];

  return rows.map((row) => {
    let gc = row.gc.trim();
    let cap = row.cap.trim();

    if (cap && !validCapCodes.has(cap)) {
      cap = "";
    }

    if (gc && !validGcCodes.has(gc)) {
      gc = "";
    }

    if (!cap && firstCap) {
      cap = firstCap.code;
    }

    if (!gc) {
      const capInfo = capitulos.find((c) => c.code === cap);
      if (capInfo) {
        gc = capInfo.grandeCapituloCode;
      } else if (firstCap) {
        gc = firstCap.grandeCapituloCode;
      }
    }

    const qtdNum = parseNum(row.qtd);
    const custoNum = parseNum(row.custoUnit);
    let kNum = parseNum(row.k);
    const capInfo = capitulos.find((c) => c.code === cap);
    if (!kNum && capInfo?.kFactor) {
      kNum = capInfo.kFactor;
    }
    let puNum = parseNum(row.pu);
    if (!puNum && custoNum && kNum) {
      puNum = custoNum * kNum;
    }

    const totalNum =
      qtdNum && puNum ? qtdNum * puNum : Number.NaN;
    const margemNum =
      custoNum && puNum ? ((puNum - custoNum) / custoNum) * 100 : Number.NaN;

    let code = row.code.trim();
    if (cap && gc && !code) {
      code = generateNextCodeForCap(cap, used);
      used.add(code);
    } else if (code) {
      used.add(code);
    }

    return {
      ...row,
      gc,
      cap,
      code,
      qtd: row.qtd || (qtdNum ? qtdNum.toString() : ""),
      k: row.k || (kNum ? kNum.toString() : ""),
      custoUnit:
        row.custoUnit || (custoNum ? custoNum.toFixed(2) : ""),
      pu: row.pu || (puNum ? puNum.toFixed(2) : ""),
      total: Number.isFinite(totalNum)
        ? totalNum.toFixed(2)
        : row.total,
      margemPercent: Number.isFinite(margemNum)
        ? margemNum.toFixed(1)
        : row.margemPercent,
    };
  });
}

const columns: readonly Column<ExcelRow>[] = [
  { key: "gc", name: "GC", width: 70, resizable: true, editable: true },
  { key: "cap", name: "Capítulo", width: 80, resizable: true, editable: true },
  {
    key: "code",
    name: "Código",
    width: 100,
    resizable: true,
    editable: false,
  },
  {
    key: "descricao",
    name: "Descrição",
    resizable: true,
    editable: true,
  },
  { key: "qtd", name: "Qtd", width: 70, resizable: true, editable: true },
  { key: "k", name: "K", width: 60, resizable: true, editable: true },
  { key: "unidade", name: "Unid.", width: 70, resizable: true, editable: true },
  {
    key: "custoUnit",
    name: "Custo unitário",
    width: 110,
    resizable: true,
    editable: true,
  },
  { key: "pu", name: "PU venda", width: 100, resizable: true, editable: true },
  {
    key: "total",
    name: "Total",
    width: 110,
    resizable: true,
    editable: false,
  },
  {
    key: "margemPercent",
    name: "Margem %",
    width: 100,
    resizable: true,
    editable: false,
  },
];

export function ExcelLikeImportGrid({
  artigos,
  capitulos,
  grandesCapitulos,
  existingItems,
  onAddToBudget,
  onStatusChange,
}: ExcelLikeImportGridProps) {
  const [rows, setRows] = useState<ExcelRow[]>(
    Array.from({ length: 10 }, () => createEmptyRow()),
  );
  const [rawPaste, setRawPaste] = useState<string>("");
  const [massGc, setMassGc] = useState<string>("");
  const [massCap, setMassCap] = useState<string>("");
  const [massK, setMassK] = useState<string>("");

  const baseUsedCodes = useMemo(() => {
    const s = new Set<string>();
    for (const a of artigos) s.add(a.code);
    for (const it of existingItems) s.add(it.code);
    return s;
  }, [artigos, existingItems]);

  const validGcCodes = useMemo(
    () => new Set(grandesCapitulos.map((g) => g.code)),
    [grandesCapitulos],
  );

  const validCapCodes = useMemo(
    () => new Set(capitulos.map((c) => c.code)),
    [capitulos],
  );

  const gcOptions = useMemo(
    () => grandesCapitulos.map((g) => g.code),
    [grandesCapitulos],
  );

  const capOptions = useMemo(
    () => capitulos.map((c) => c.code),
    [capitulos],
  );

  useEffect(() => {
    setRows((prev) =>
      recalcAllRows(
        prev,
        baseUsedCodes,
        capitulos,
        validGcCodes,
        validCapCodes,
      ),
    );
  }, [baseUsedCodes, capitulos, validGcCodes, validCapCodes]);

  const handleRowsChange = (nextRows: ExcelRow[]) => {
    setRows(
      recalcAllRows(
        nextRows,
        baseUsedCodes,
        capitulos,
        validGcCodes,
        validCapCodes,
      ),
    );
  };

  const handleAddEmptyRows = () => {
    setRows((prev) => [...prev, createEmptyRow(), createEmptyRow(), createEmptyRow()]);
  };

  const applyMassGc = () => {
    if (!massGc) return;
    const next = rows.map((row) => ({ ...row, gc: massGc }));
    setRows(
      recalcAllRows(
        next,
        baseUsedCodes,
        capitulos,
        validGcCodes,
        validCapCodes,
      ),
    );
    if (onStatusChange) {
      onStatusChange(`Grande capítulo ${massGc} aplicado a todas as linhas.`);
    }
  };

  const applyMassCap = () => {
    if (!massCap) return;
    const next = rows.map((row) => ({ ...row, cap: massCap }));
    setRows(
      recalcAllRows(
        next,
        baseUsedCodes,
        capitulos,
        validGcCodes,
        validCapCodes,
      ),
    );
    if (onStatusChange) {
      onStatusChange(`Capítulo ${massCap} aplicado a todas as linhas.`);
    }
  };

  const applyMassK = () => {
    const kNum = parseNum(massK);
    if (!kNum || kNum <= 0) return;
    const next = rows.map((row) => ({ ...row, k: kNum.toString() }));
    setRows(
      recalcAllRows(
        next,
        baseUsedCodes,
        capitulos,
        validGcCodes,
        validCapCodes,
      ),
    );
    if (onStatusChange) {
      onStatusChange(`K=${kNum} aplicado a todas as linhas.`);
    }
  };

  const regenerateCodes = () => {
    const cleared = rows.map((row) => ({ ...row, code: "" }));
    setRows(
      recalcAllRows(
        cleared,
        baseUsedCodes,
        capitulos,
        validGcCodes,
        validCapCodes,
      ),
    );
    if (onStatusChange) {
      onStatusChange("Códigos regenerados com base em GC, capítulo e descrição.");
    }
  };

  const handleAddToBudgetClick = () => {
    const updatedRows = recalcAllRows(
      rows,
      baseUsedCodes,
      capitulos,
      validGcCodes,
      validCapCodes,
    );
    setRows(updatedRows);

    const novos: DraftBudgetItem[] = [];

    for (const row of updatedRows) {
      const description = row.descricao.trim();
      const qtdNum = parseNum(row.qtd) || 1;
      const unit = row.unidade.trim() || "un";
      const custoNum = parseNum(row.custoUnit);
      const puNum = parseNum(row.pu);

      if (!description && !custoNum && !puNum) continue;

      let gcCode = row.gc.trim();
      let capCode = row.cap.trim();
      const firstCap = capitulos[0];

      if (!capCode && firstCap) {
        capCode = firstCap.code;
      }

      const capInfo = capitulos.find((c) => c.code === capCode);
      if (!gcCode) {
        if (capInfo) {
          gcCode = capInfo.grandeCapituloCode;
        } else if (firstCap) {
          gcCode = firstCap.grandeCapituloCode;
        } else {
          gcCode = "?";
        }
      }

      if (!capCode) continue;

      let kAplicado = parseNum(row.k);
      if (!kAplicado && capInfo?.kFactor) {
        kAplicado = capInfo.kFactor;
      }
      if (!kAplicado) {
        kAplicado = 1;
      }

      const custoUnitario = custoNum || 0;
      let precoVendaUnitario = puNum;
      if (!precoVendaUnitario && custoUnitario && kAplicado) {
        precoVendaUnitario = custoUnitario * kAplicado;
      }
      const unitPrice = precoVendaUnitario || custoUnitario;

      const code = row.code.trim();
      if (!code) continue;

      novos.push({
        rowId: `${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        code,
        description,
        unit,
        quantity: qtdNum,
        unitPrice,
        kAplicado,
        custoUnitario,
        precoVendaUnitario: precoVendaUnitario || undefined,
        grandeCapituloCode: gcCode,
        capituloCode: capCode,
      });
    }

    if (!novos.length) {
      if (onStatusChange) {
        onStatusChange("Nenhuma linha válida encontrada na tabela Excel.");
      }
      return;
    }

    onAddToBudget(novos);
    if (onStatusChange) {
      onStatusChange(
        `${novos.length} artigo${
          novos.length > 1 ? "s" : ""
        } adicionados ao orçamento a partir da tabela Excel.`,
      );
    }
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1 text-[10px] text-slate-600">
        <label className="block font-medium text-slate-700">
          Colar linhas do Excel
        </label>
        <textarea
          value={rawPaste}
          onChange={(e) => setRawPaste(e.target.value)}
          rows={4}
          placeholder={
            "Cole aqui linhas copiadas do Excel\nFormato esperado (colunas separadas por TAB):\nDescrição\tQtd\tUnid\tPU"
          }
          className="w-full rounded border border-slate-200 px-2 py-1 text-[11px] font-mono text-slate-800 placeholder:text-slate-400"
        />
        <button
          type="button"
          onClick={() => {
            const text = rawPaste.trim();
            if (!text) return;
            const lines = text.split(/\r?\n/);
            const parsed: ExcelRow[] = [];
            for (const line of lines) {
              const parts = line.split("\t");
              const descricao = (parts[0] ?? "").trim();
              const qtd = (parts[1] ?? "").trim();
              const unidade = (parts[2] ?? "").trim();
              const pu = (parts[3] ?? "").trim();
              if (!descricao && !qtd && !unidade && !pu) continue;
              parsed.push({
                id: `${Date.now().toString(36)}-${Math.random()
                  .toString(36)
                  .slice(2, 8)}`,
                gc: "",
                cap: "",
                code: "",
                descricao,
                qtd,
                k: "",
                unidade,
                custoUnit: "",
                pu,
                total: "",
                margemPercent: "",
              });
            }
            if (!parsed.length) {
              if (onStatusChange) {
                onStatusChange(
                  "Não foram encontradas linhas válidas na colagem (esperado: Descrição, Qtd, Unid, PU).",
                );
              }
              return;
            }
            const recalculated = recalcAllRows(
              parsed,
              baseUsedCodes,
              capitulos,
              validGcCodes,
              validCapCodes,
            );
            setRows(recalculated);
            if (onStatusChange) {
              onStatusChange(
                `${recalculated.length} linha${
                  recalculated.length > 1 ? "s" : ""
                } importadas a partir da colagem.`,
              );
            }
          }}
          className="mt-1 rounded-full bg-slate-800 px-3 py-1 text-[10px] font-medium text-white hover:bg-slate-700"
        >
          Processar colagem
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-600">
        <span className="font-medium text-slate-700">Ações em massa:</span>
        <label className="inline-flex items-center gap-1">
          <span>GC</span>
          <select
            value={massGc}
            onChange={(e) => setMassGc(e.target.value)}
            className="rounded border border-slate-200 bg-white px-2 py-1 text-[10px]"
          >
            <option value="">—</option>
            {gcOptions.map((gc) => (
              <option key={gc} value={gc}>
                {gc}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={applyMassGc}
            className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Aplicar GC a todas
          </button>
        </label>
        <label className="inline-flex items-center gap-1">
          <span>Cap.</span>
          <select
            value={massCap}
            onChange={(e) => setMassCap(e.target.value)}
            className="rounded border border-slate-200 bg-white px-2 py-1 text-[10px]"
          >
            <option value="">—</option>
            {capOptions.map((cap) => (
              <option key={cap} value={cap}>
                {cap}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={applyMassCap}
            className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Aplicar capítulo a todas
          </button>
        </label>
        <label className="inline-flex items-center gap-1">
          <span>K</span>
          <input
            type="text"
            value={massK}
            onChange={(e) => setMassK(e.target.value)}
            className="w-14 rounded border border-slate-200 px-2 py-1 text-[10px]"
            placeholder="1,00"
          />
          <button
            type="button"
            onClick={applyMassK}
            className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Aplicar K a todas
          </button>
        </label>
        <button
          type="button"
          onClick={regenerateCodes}
          className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-slate-50"
        >
          Regerar códigos
        </button>
      </div>
      <div className="h-72 max-h-[28rem] overflow-hidden rounded border border-slate-100">
        <DataGrid
          columns={columns}
          rows={rows}
          onRowsChange={handleRowsChange}
          className="rdg-light text-[11px]"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleAddEmptyRows}
          className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50"
        >
          + 3 linhas
        </button>
        <button
          type="button"
          onClick={handleAddToBudgetClick}
          className="rounded-full bg-slate-800 px-4 py-1.5 text-[11px] font-medium text-white transition hover:bg-slate-700"
        >
          Adicionar ao orçamento
        </button>
        <p className="text-[10px] text-slate-500">
          Pode escrever célula a célula ou colar blocos copiados diretamente do
          Excel/Sheets. As colunas GC e Capítulo determinam o código sequencial
          gerado para cada artigo.
        </p>
      </div>
    </div>
  );
}

