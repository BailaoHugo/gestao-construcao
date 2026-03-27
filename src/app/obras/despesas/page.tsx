"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { TopBar } from "@/components/layout/TopBar";

type DespesaItem = {
  source_key: string;
  source_status: string;
  match_status: string;
  match_key_used: string | null;
  obra: string;
  supplier: string | null;
  document_type: string | null;
  document_no: string | null;
  purchase_invoice_no: string | null;
  transaction_info: string | null;
  invoice_date: string | null;
  gross_total: string | null;
  net_total: string | null;
  tax_payable: string | null;
  line_descriptions: string | null;
  source_file_name: string;
  source_file_rel_path: string | null;
  ingested_at: string;
  canonical_document_id: string | null;
  canonical_line_count: number | null;
};

type ApiPayload = {
  totalRows: number;
  summary: {
    rows_count: number;
    gross_total_sum: string;
    net_total_sum: string;
    tax_total_sum: string;
  };
  items: DespesaItem[];
};

type DocumentDetailPayload = {
  document: {
    id: string;
    source_key: string;
    supplier_id: string | null;
    obra_id: string | null;
    match_status: string | null;
    match_key_used: string | null;
    invoice_date: string | null;
    document_type: string | null;
    document_no: string | null;
    purchase_invoice_no: string | null;
    transaction_info: string | null;
    gross_total: string | null;
    net_total: string | null;
    tax_payable: string | null;
    source_file_name: string | null;
    source_file_rel_path: string | null;
    extract_version: string;
    header_extras: unknown;
    obra_code: string | null;
    obra_name: string | null;
    supplier_name: string | null;
    supplier_nif: string | null;
  };
  lines: Array<{
    id: string;
    line_no: number;
    article_code: string | null;
    description: string | null;
    unit: string | null;
    quantity: string | null;
    unit_price: string | null;
    line_total: string | null;
    discount_amount: string | null;
    vat_rate_percent: string | null;
    vat_amount: string | null;
    line_extras: unknown;
  }>;
};

type ExtractionPayload = {
  source_key: string;
  extract_version: string;
  status: string;
  extractor: string;
  confidence_score: string | null;
  raw_text: string | null;
  header_json: unknown;
  lines_json: unknown;
  validation_json: unknown;
  error: string | null;
  updated_at: string;
};

type UploadExtractResult = {
  fileName: string;
  fileSize: number;
  status: string;
  extractor: string;
  confidence_score: number;
  raw_text: string | null;
  header_json: unknown;
  lines_json: unknown;
  validation_json: unknown;
  error: string | null;
};

function formatMoney(value?: string | null) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

export default function RegistoDespesasPage() {
  const [obra, setObra] = useState("");
  const [supplier, setSupplier] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [includeSemObra, setIncludeSemObra] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<ApiPayload | null>(null);
  const [extractModal, setExtractModal] = useState<{
    sourceKey: string;
    payload: ExtractionPayload | null;
    loading: boolean;
    error: string;
  } | null>(null);
  const [detailModal, setDetailModal] = useState<{
    sourceKey: string;
    payload: DocumentDetailPayload | null;
    loading: boolean;
    error: string;
  } | null>(null);
  const [aggGroupBy, setAggGroupBy] = useState<"supplier" | "day" | "article">("supplier");
  const [aggData, setAggData] = useState<{
    groupBy: string;
    rows: Array<Record<string, string | number | null>>;
  } | null>(null);
  const [aggLoading, setAggLoading] = useState(false);
  const [aggError, setAggError] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadResult, setUploadResult] = useState<UploadExtractResult | null>(null);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (obra.trim()) sp.set("obra", obra.trim());
    if (supplier.trim()) sp.set("supplier", supplier.trim());
    if (dateFrom) sp.set("dateFrom", dateFrom);
    if (dateTo) sp.set("dateTo", dateTo);
    sp.set("includeSemObra", includeSemObra ? "1" : "0");
    sp.set("limit", "300");
    return sp.toString();
  }, [obra, supplier, dateFrom, dateTo, includeSemObra]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    fetch(`/api/obras/despesas?${queryString}`)
      .then(async (res) => {
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.error || `Erro HTTP ${res.status}`);
        }
        return (await res.json()) as ApiPayload;
      })
      .then((payload) => {
        if (!active) return;
        setData(payload);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [queryString]);

  const aggQueryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (obra.trim()) sp.set("obra", obra.trim());
    if (supplier.trim()) sp.set("supplier", supplier.trim());
    if (dateFrom) sp.set("dateFrom", dateFrom);
    if (dateTo) sp.set("dateTo", dateTo);
    sp.set("includeSemObra", includeSemObra ? "1" : "0");
    sp.set("groupBy", aggGroupBy);
    sp.set("limit", "50");
    return sp.toString();
  }, [obra, supplier, dateFrom, dateTo, includeSemObra, aggGroupBy]);

  useEffect(() => {
    let active = true;
    setAggLoading(true);
    setAggError("");
    fetch(`/api/obras/despesas/aggregates?${aggQueryString}`)
      .then(async (res) => {
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.error || `Erro HTTP ${res.status}`);
        }
        return (await res.json()) as {
          groupBy: string;
          rows: Array<Record<string, string | number | null>>;
        };
      })
      .then((payload) => {
        if (!active) return;
        setAggData(payload);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message = err instanceof Error ? err.message : String(err);
        setAggError(message);
        setAggData(null);
      })
      .finally(() => {
        if (!active) return;
        setAggLoading(false);
      });
    return () => {
      active = false;
    };
  }, [aggQueryString]);

  async function runUpload(file: File | null) {
    if (!file) return;
    setUploadLoading(true);
    setUploadError("");
    setUploadResult(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/obras/despesas/extract-upload", {
        method: "POST",
        body: fd,
      });
      const payload = (await res.json()) as UploadExtractResult & { error?: string };
      if (!res.ok) {
        throw new Error(payload?.error || `Erro HTTP ${res.status}`);
      }
      setUploadResult(payload);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setUploadError(message);
    } finally {
      setUploadLoading(false);
    }
  }

  async function openDetail(sourceKey: string) {
    setDetailModal({ sourceKey, payload: null, loading: true, error: "" });
    try {
      const enc = encodeURIComponent(sourceKey);
      const res = await fetch(`/api/obras/despesas/${enc}/document`);
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || `Erro HTTP ${res.status}`);
      }
      const payload = (await res.json()) as DocumentDetailPayload;
      setDetailModal({ sourceKey, payload, loading: false, error: "" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setDetailModal({ sourceKey, payload: null, loading: false, error: message });
    }
  }

  async function openExtraction(sourceKey: string) {
    setExtractModal({ sourceKey, payload: null, loading: true, error: "" });
    try {
      const res = await fetch(`/api/obras/despesas/${sourceKey}/extraction`);
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || `Erro HTTP ${res.status}`);
      }
      const payload = (await res.json()) as ExtractionPayload;
      setExtractModal({ sourceKey, payload, loading: false, error: "" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setExtractModal({ sourceKey, payload: null, loading: false, error: message });
    }
  }

  return (
    <MainLayout>
      <TopBar title="Registo de despesas" />
      <main className="space-y-6 rounded-2xl bg-white/80 p-8 shadow-sm ring-1 ring-slate-100">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Registo de despesas</h1>
          <p className="mt-2 text-sm text-slate-500">
            Consulta read-only de custos importados do TOConline por obra. Podes também extrair
            uma factura recebida por e-mail ou digitalizada (PDF ou imagem).
          </p>
        </div>

        <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-4">
          <h2 className="text-sm font-semibold text-slate-800">Extrair factura (ficheiro local)</h2>
          <p className="mt-1 text-xs text-slate-600">
            PDF com texto ou imagem (JPG/PNG…). Imagens usam OCR no servidor (Tesseract), se
            estiver instalado.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm hover:bg-slate-50">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.gif"
                className="sr-only"
                disabled={uploadLoading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void runUpload(f);
                  e.target.value = "";
                }}
              />
              {uploadLoading ? "A extrair…" : "Escolher ficheiro"}
            </label>
            {uploadLoading ? (
              <span className="text-xs text-slate-500">A processar PDF ou OCR…</span>
            ) : null}
          </div>
          {uploadError ? (
            <p className="mt-2 text-sm text-rose-600">{uploadError}</p>
          ) : null}
          {uploadResult ? (
            <div className="mt-4 space-y-3 text-sm">
              <p className="text-xs text-slate-600">
                <strong>{uploadResult.fileName}</strong> ({uploadResult.fileSize} bytes) —{" "}
                <span className="font-medium">{uploadResult.status}</span> ·{" "}
                {uploadResult.extractor} · confiança {uploadResult.confidence_score}
                {uploadResult.error ? (
                  <span className="text-rose-600"> · {uploadResult.error}</span>
                ) : null}
              </p>
              <details open className="rounded-lg border border-slate-200 bg-white p-3">
                <summary className="cursor-pointer font-medium text-slate-800">Cabeçalho</summary>
                <pre className="mt-2 max-h-48 overflow-auto rounded bg-slate-900 p-2 text-xs text-slate-100">
                  {JSON.stringify(uploadResult.header_json, null, 2)}
                </pre>
              </details>
              <details className="rounded-lg border border-slate-200 bg-white p-3">
                <summary className="cursor-pointer font-medium text-slate-800">Linhas</summary>
                <pre className="mt-2 max-h-48 overflow-auto rounded bg-slate-900 p-2 text-xs text-slate-100">
                  {JSON.stringify(uploadResult.lines_json, null, 2)}
                </pre>
              </details>
              <details className="rounded-lg border border-slate-200 bg-white p-3">
                <summary className="cursor-pointer font-medium text-slate-800">Validação</summary>
                <pre className="mt-2 max-h-36 overflow-auto rounded bg-slate-900 p-2 text-xs text-slate-100">
                  {JSON.stringify(uploadResult.validation_json, null, 2)}
                </pre>
              </details>
              <details className="rounded-lg border border-slate-200 bg-white p-3">
                <summary className="cursor-pointer font-medium text-slate-800">Texto bruto</summary>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-slate-100 p-2 text-xs text-slate-700">
                  {uploadResult.raw_text || "(vazio)"}
                </pre>
              </details>
            </div>
          ) : null}
        </section>

        <section className="grid gap-3 md:grid-cols-5">
          <input
            value={obra}
            onChange={(e) => setObra(e.target.value)}
            placeholder="Filtrar obra"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            placeholder="Filtrar fornecedor"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={includeSemObra}
              onChange={(e) => setIncludeSemObra(e.target.checked)}
            />
            Incluir SEM_OBRA
          </label>
        </section>

        {loading ? (
          <p className="text-sm text-slate-500">A carregar despesas...</p>
        ) : null}
        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <section className="rounded-xl border border-slate-200 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-800">Agregações (linhas canónicas)</h2>
            <select
              value={aggGroupBy}
              onChange={(e) =>
                setAggGroupBy(e.target.value as "supplier" | "day" | "article")
              }
              className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
            >
              <option value="supplier">Por fornecedor</option>
              <option value="day">Por dia</option>
              <option value="article">Por artigo / descrição</option>
            </select>
            {aggLoading ? (
              <span className="text-xs text-slate-500">A carregar…</span>
            ) : null}
          </div>
          {aggError ? (
            <p className="text-sm text-rose-600">{aggError}</p>
          ) : null}
          {aggData?.rows?.length ? (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-2 py-1">Chave</th>
                    <th className="px-2 py-1">Etiqueta</th>
                    <th className="px-2 py-1 text-right">Soma linhas</th>
                    <th className="px-2 py-1 text-right">Outros</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {aggData.rows.map((r, i) => (
                    <tr key={`${r.key}-${i}`}>
                      <td className="max-w-[12rem] truncate px-2 py-1 text-slate-700">
                        {String(r.key ?? "")}
                      </td>
                      <td className="max-w-xs truncate px-2 py-1 text-slate-700">
                        {String(r.label ?? "")}
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums">
                        {formatMoney(String(r.line_total_sum ?? 0))}
                      </td>
                      <td className="px-2 py-1 text-right text-xs text-slate-600">
                        {r.invoice_count != null
                          ? `${r.invoice_count} fat.`
                          : r.line_count != null
                            ? `${r.line_count} linhas`
                            : r.quantity_sum != null
                              ? `Qtd ${r.quantity_sum}`
                              : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !aggLoading && !aggError ? (
            <p className="text-sm text-slate-500">
              Sem dados agregados (corre a migração e{" "}
              <code className="rounded bg-slate-100 px-1">npm run toconline:canonical:etl</code>
              ).
            </p>
          ) : null}
        </section>

        {data ? (
          <section className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Registos</p>
              <p className="text-lg font-semibold text-slate-900">{data.totalRows}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Total bruto</p>
              <p className="text-lg font-semibold text-slate-900">
                {formatMoney(data.summary.gross_total_sum)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Total líquido</p>
              <p className="text-lg font-semibold text-slate-900">
                {formatMoney(data.summary.net_total_sum)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Total IVA</p>
              <p className="text-lg font-semibold text-slate-900">
                {formatMoney(data.summary.tax_total_sum)}
              </p>
            </div>
          </section>
        ) : null}

        <section className="overflow-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Obra</th>
                <th className="px-3 py-2">Fornecedor</th>
                <th className="px-3 py-2">Documento</th>
                <th className="px-3 py-2">Bruto</th>
                <th className="px-3 py-2">Líquido</th>
                <th className="px-3 py-2">IVA</th>
                <th className="px-3 py-2">Artigos (descrição)</th>
                <th className="px-3 py-2 text-center">Linhas</th>
                <th className="px-3 py-2">Anexo</th>
                <th className="px-3 py-2">Preview</th>
                <th className="px-3 py-2">Detalhe</th>
                <th className="px-3 py-2">Extração</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.items || []).map((row) => (
                <tr key={row.source_key} className="align-top">
                  <td className="px-3 py-2 text-slate-700">{row.invoice_date || "-"}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                        row.obra === "SEM_OBRA"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {row.obra}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{row.supplier || "-"}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {row.document_no || row.purchase_invoice_no || "-"}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{formatMoney(row.gross_total)}</td>
                  <td className="px-3 py-2 text-slate-700">{formatMoney(row.net_total)}</td>
                  <td className="px-3 py-2 text-slate-700">{formatMoney(row.tax_payable)}</td>
                  <td className="max-w-xs px-3 py-2 text-xs text-slate-600">
                    <div className="line-clamp-3">{row.line_descriptions || "-"}</div>
                  </td>
                  <td className="px-3 py-2 text-center text-xs text-slate-700">
                    {row.canonical_line_count != null ? row.canonical_line_count : "-"}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">{row.source_file_name}</td>
                  <td className="px-3 py-2 text-xs">
                    <a
                      href={`/api/obras/despesas/${row.source_key}/anexo`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-md border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50"
                    >
                      Preview
                    </a>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <button
                      type="button"
                      onClick={() => openDetail(row.source_key)}
                      className="inline-flex rounded-md border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50"
                    >
                      Detalhe
                    </button>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <button
                      type="button"
                      onClick={() => openExtraction(row.source_key)}
                      className="inline-flex rounded-md border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50"
                    >
                      Ver extração
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && (data?.items?.length || 0) === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={13}>
                    Sem resultados para os filtros aplicados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>

        {detailModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-xl bg-white p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Factura (canónico)</h2>
                <button
                  type="button"
                  onClick={() => setDetailModal(null)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
                >
                  Fechar
                </button>
              </div>
              {detailModal.loading ? (
                <p className="text-sm text-slate-500">A carregar detalhe...</p>
              ) : null}
              {detailModal.error ? (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {detailModal.error}
                </p>
              ) : null}
              {detailModal.payload ? (
                <div className="space-y-4 text-sm">
                  <div className="grid gap-2 md:grid-cols-2">
                    <p>
                      <strong>Obra:</strong> {detailModal.payload.document.obra_code || "-"}
                    </p>
                    <p>
                      <strong>Fornecedor:</strong>{" "}
                      {detailModal.payload.document.supplier_name || "-"}{" "}
                      {detailModal.payload.document.supplier_nif
                        ? `(NIF ${detailModal.payload.document.supplier_nif})`
                        : ""}
                    </p>
                    <p>
                      <strong>Data:</strong> {detailModal.payload.document.invoice_date || "-"}
                    </p>
                    <p>
                      <strong>Documento:</strong>{" "}
                      {detailModal.payload.document.document_no ||
                        detailModal.payload.document.purchase_invoice_no ||
                        "-"}
                    </p>
                    <p>
                      <strong>Bruto / Líquido / IVA:</strong>{" "}
                      {formatMoney(detailModal.payload.document.gross_total)} /{" "}
                      {formatMoney(detailModal.payload.document.net_total)} /{" "}
                      {formatMoney(detailModal.payload.document.tax_payable)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Versão extração: {detailModal.payload.document.extract_version}
                    </p>
                  </div>
                  <div className="overflow-auto rounded-lg border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-xs">
                      <thead className="bg-slate-50 text-left text-slate-500">
                        <tr>
                          <th className="px-2 py-2">#</th>
                          <th className="px-2 py-2">Artigo</th>
                          <th className="px-2 py-2">Descrição</th>
                          <th className="px-2 py-2 text-right">Qtd</th>
                          <th className="px-2 py-2 text-right">P. unit.</th>
                          <th className="px-2 py-2 text-right">Total linha</th>
                          <th className="px-2 py-2 text-right">IVA %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailModal.payload.lines.map((ln) => (
                          <tr key={ln.id}>
                            <td className="px-2 py-1.5 tabular-nums text-slate-600">{ln.line_no}</td>
                            <td className="max-w-[8rem] truncate px-2 py-1.5 text-slate-700">
                              {ln.article_code || "-"}
                            </td>
                            <td className="max-w-md px-2 py-1.5 text-slate-800">{ln.description}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums">
                              {ln.quantity ?? "-"}
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums">
                              {formatMoney(ln.unit_price)}
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums">
                              {formatMoney(ln.line_total)}
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums">
                              {ln.vat_rate_percent != null ? `${ln.vat_rate_percent}%` : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {detailModal.payload.lines.length === 0 ? (
                    <p className="text-slate-500">
                      Sem linhas na base canónica. Corre{" "}
                      <code className="rounded bg-slate-100 px-1">npm run toconline:canonical:etl</code>{" "}
                      após extração.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {extractModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-xl bg-white p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Extração da fatura</h2>
                <button
                  type="button"
                  onClick={() => setExtractModal(null)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
                >
                  Fechar
                </button>
              </div>
              {extractModal.loading ? (
                <p className="text-sm text-slate-500">A carregar extração...</p>
              ) : null}
              {extractModal.error ? (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {extractModal.error}
                </p>
              ) : null}
              {extractModal.payload ? (
                <div className="space-y-3 text-sm">
                  <p>
                    <strong>Status:</strong> {extractModal.payload.status} |{" "}
                    <strong>Extractor:</strong> {extractModal.payload.extractor} |{" "}
                    <strong>Confiança:</strong> {extractModal.payload.confidence_score || "-"}
                  </p>
                  <details open>
                    <summary className="cursor-pointer font-medium text-slate-800">Header JSON</summary>
                    <pre className="mt-2 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
                      {JSON.stringify(extractModal.payload.header_json, null, 2)}
                    </pre>
                  </details>
                  <details>
                    <summary className="cursor-pointer font-medium text-slate-800">Linhas JSON</summary>
                    <pre className="mt-2 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
                      {JSON.stringify(extractModal.payload.lines_json, null, 2)}
                    </pre>
                  </details>
                  <details>
                    <summary className="cursor-pointer font-medium text-slate-800">
                      Validation JSON
                    </summary>
                    <pre className="mt-2 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
                      {JSON.stringify(extractModal.payload.validation_json, null, 2)}
                    </pre>
                  </details>
                  <details>
                    <summary className="cursor-pointer font-medium text-slate-800">Raw text</summary>
                    <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-100 p-3 text-xs text-slate-700">
                      {extractModal.payload.raw_text || "(vazio)"}
                    </pre>
                  </details>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <p className="text-sm text-slate-500">
          <Link href="/obras" className="underline hover:no-underline">
            Voltar a Obras
          </Link>
        </p>
      </main>
    </MainLayout>
  );
}
