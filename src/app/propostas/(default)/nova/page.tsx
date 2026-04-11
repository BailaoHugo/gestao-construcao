"use client";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { PropostaFolhaRosto, PropostaLinha } from "@/propostas/domain";
import { formatCurrencyPt } from "@/propostas/format";
import LinhasEditor, { type CatalogoArtigo } from "@/components/propostas/LinhasEditor";
import type { ImportLinhaDraft } from "@/lib/propostas/parseImportedLines";
import { importDraftToPropostaLinha } from "@/lib/propostas/importedLineToPropostaLinha";
import { MariaPanel } from "@/components/propostas/MariaPanel";
import { CatalogoLateralPanel } from "@/components/propostas/CatalogoLateralPanel";
import { CollapsibleSection } from "@/components/propostas/CollapsibleSection";
import { ResumoCapitulosPanel } from "@/components/propostas/ResumoCapitulosPanel";

// ââ tipos auxiliares ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
type ClienteRow = { id: string; nome: string; telefone?: string; email?: string };
type ObraRow    = { id: string; code: string; nome: string };

// ââ Combobox genÃ©rico ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function Combobox<T extends { id: string; label: string; sub?: string }>({
  value,
  onChange,
  onSelect,
  placeholder,
  fetchOptions,
  inputClassName,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (item: T) => void;
  placeholder?: string;
  fetchOptions: (q: string) => Promise<T[]>;
  inputClassName?: string;
}) {
  const [open, setOpen]       = useState(false);
  const [options, setOptions] = useState<T[]>([]);
  const [active, setActive]   = useState(-1);
  const containerRef           = useRef<HTMLDivElement>(null);
  const timerRef               = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doFetch = useCallback(async (q: string) => {
    const results = await fetchOptions(q);
    setOptions(results);
    setOpen(results.length > 0);
    setActive(-1);
  }, [fetchOptions]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doFetch(v), 250);
  };

  const handleSelect = (item: T) => {
    onSelect(item);
    setOpen(false);
    setOptions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(a + 1, options.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    if (e.key === "Enter" && active >= 0) { e.preventDefault(); handleSelect(options[active]); }
    if (e.key === "Escape") { setOpen(false); }
  };

  // fechar ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={() => { if (value.length === 0) doFetch(""); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={inputClassName ?? "w-full rounded border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400"}
      />
      {open && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg text-xs overflow-hidden">
          {options.map((item, i) => (
            <li
              key={item.id}
              onMouseDown={() => handleSelect(item)}
              className={`flex flex-col px-3 py-2 cursor-pointer ${i === active ? "bg-blue-50" : "hover:bg-slate-50"}`}
            >
              <span className="font-medium text-slate-800">{item.label}</span>
              {item.sub && <span className="text-[10px] text-slate-400">{item.sub}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ââ helpers de fetch âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
async function fetchClientes(q: string): Promise<(ClienteRow & { id: string; label: string; sub?: string })[]> {
  const r = await fetch(`/api/clientes?search=${encodeURIComponent(q)}&limit=20`);
  if (!r.ok) return [];
  const d = await r.json() as { rows?: ClienteRow[]; data?: ClienteRow[]; items?: ClienteRow[] };
  const rows = d.rows ?? d.data ?? d.items ?? [];
  return rows.map(c => ({ ...c, label: c.nome, sub: c.email ?? c.telefone ?? undefined }));
}

async function fetchObras(q: string): Promise<(ObraRow & { id: string; label: string; sub?: string })[]> {
  const r = await fetch(`/api/obras?search=${encodeURIComponent(q)}&limit=20&estado=ativo`);
  if (!r.ok) return [];
  const d = await r.json() as { rows?: ObraRow[]; data?: ObraRow[]; items?: ObraRow[] };
  const rows = d.rows ?? d.data ?? d.items ?? [];
  return rows.map(o => ({ ...o, label: o.nome, sub: o.code }));
}

// ââ utilidades âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function createEmptyFolhaRosto(): PropostaFolhaRosto {
  const today = new Date().toISOString().slice(0, 10);
  return {
    clienteNome: "", clienteContacto: "", clienteEmail: "", clienteId: null,
    obraNome: "", obraMorada: "", obraId: null,
    dataProposta: today, validadeDias: 30,
    referenciaInterna: "", notas: "",
  };
}

type CatalogoLinhasLayout = "split" | "catalogoFull" | "linhasFull";

function createEmptyLinha(): PropostaLinha {
  return {
    id: crypto.randomUUID(), artigoId: null, origem: "LIVRE",
    descricao: "", unidade: "", quantidade: 1, k: 1.3,
    precoCustoUnitario: 0, totalCustoLinha: 0,
    precoVendaUnitario: 0, totalVendaLinha: 0,
  };
}

// ââ pÃ¡gina principal âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export default function NovaPropostaPage() {
  const router = useRouter();
  const [folhaRosto, setFolhaRosto] = useState<PropostaFolhaRosto>(createEmptyFolhaRosto);
  const [linhas, setLinhas]         = useState<PropostaLinha[]>([]);
  const [isSaving, setIsSaving]     = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [fatorVenda, setFatorVenda] = useState(1.3);
  const [catalogoLinhasLayout, setCatalogoLinhasLayout] = useState<CatalogoLinhasLayout>("split");
  const errorBannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error && errorBannerRef.current) {
      errorBannerRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [error]);

  const totais = useMemo(() => {
    const totalCusto  = linhas.reduce((s, l) => s + l.totalCustoLinha, 0);
    const totalVenda  = linhas.reduce((s, l) => s + l.totalVendaLinha, 0);
    const margemValor = totalVenda - totalCusto;
    const margemPercentagem = totalVenda > 0 ? (margemValor / totalVenda) * 100 : 0;
    return { totalCusto, totalVenda, margemValor, margemPercentagem };
  }, [linhas]);

  const handleAddLinhaLivre = () => setLinhas(p => [...p, createEmptyLinha()]);
  const handleRemoverLinha  = (id: string) => setLinhas(p => p.filter(l => l.id !== id));
  const handleInsertImportedLines = (imported: ImportLinhaDraft[]) =>
    setLinhas(p => [...p, ...imported.map(importDraftToPropostaLinha)]);

  const handleAddLinhaFromCatalogo = (
    artigo: { id?: string | null; codigo: string; descricao: string; unidade: string | null;
              grande_capitulo?: string | null; capitulo: string | null;
              preco_custo_unitario: number | null; preco_venda_unitario: number | null },
    quantidadeParam = 1,
  ) => {
    const quantidade  = Number.isFinite(quantidadeParam) ? quantidadeParam : 1;
    const precoCusto  = artigo.preco_custo_unitario ?? 0;
    const precoVenda  = artigo.preco_venda_unitario ?? 0;
    setLinhas(p => [...p, {
      id: crypto.randomUUID(), artigoId: artigo.id ?? null,
      codigoArtigo: artigo.codigo, origem: "CATALOGO",
      descricao: artigo.descricao, unidade: artigo.unidade ?? "",
      grandeCapitulo: artigo.grande_capitulo ?? "", capitulo: artigo.capitulo ?? "",
      quantidade, k: 1.3,
      precoCustoUnitario: precoCusto, totalCustoLinha: quantidade * precoCusto,
      precoVendaUnitario: precoVenda, totalVendaLinha: quantidade * precoVenda,
    }]);
  };

  const handleSelectArtigo = (artigo: CatalogoArtigo) => handleAddLinhaFromCatalogo(artigo, 1);

  const handleGuardar = async () => {
    if (!folhaRosto.clienteNome) { setError("Indique o nome do cliente."); return; }
    if (linhas.length === 0)     { setError("Adicione pelo menos uma linha Ã  proposta."); return; }
    try {
      setIsSaving(true); setError(null);
      const res = await fetch("/api/propostas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folhaRosto, linhas }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error || "Falha ao gravar proposta");
      }
      const data = await res.json() as { id: string };
      router.push(`/propostas/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const inputCls = "w-full rounded border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400";

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Nova proposta</h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Preencha a folha de rosto e as linhas da proposta.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 no-print">
          <button type="button" onClick={() => typeof window !== "undefined" && window.print()}
            className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-slate-800">
            Imprimir / PDF
          </button>
          <span className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-white">
            Rascunho
          </span>
        </div>
      </header>

      {error && (
        <div ref={errorBannerRef} role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">
          <p className="font-medium">NÃ£o foi possÃ­vel gravar</p>
          <p className="mt-1 text-red-700">{error}</p>
        </div>
      )}

      <CollapsibleSection title="Folha de rosto">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">

            {/* Coluna esquerda â Cliente */}
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-700">
                  Cliente
                  {folhaRosto.clienteId && (
                    <span className="ml-2 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                      ligado â
                    </span>
                  )}
                </label>
                <Combobox
                  value={folhaRosto.clienteNome}
                  onChange={v => setFolhaRosto(p => ({ ...p, clienteNome: v, clienteId: null }))}
                  onSelect={item => setFolhaRosto(p => ({
                    ...p,
                    clienteId:       item.id,
                    clienteNome:     item.nome,
                    clienteContacto: item.telefone ?? p.clienteContacto,
                    clienteEmail:    item.email    ?? p.clienteEmail,
                  }))}
                  placeholder="Pesquisar clienteâ¦"
                  fetchOptions={fetchClientes}
                  inputClassName={inputCls}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-700">Contacto</label>
                  <input type="text" className={inputCls}
                    value={folhaRosto.clienteContacto ?? ""}
                    onChange={e => setFolhaRosto(p => ({ ...p, clienteContacto: e.target.value }))}
                    placeholder="Telefone ou telemÃ³vel" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-700">Email</label>
                  <input type="email" className={inputCls}
                    value={folhaRosto.clienteEmail ?? ""}
                    onChange={e => setFolhaRosto(p => ({ ...p, clienteEmail: e.target.value }))}
                    placeholder="email@cliente.pt" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-700">NIF / NIPC (opcional)</label>
                <input
                  type="text"
                  className={inputCls}
                  value={folhaRosto.clienteNipc ?? ""}
                  onChange={e => setFolhaRosto(p => ({ ...p, clienteNipc: e.target.value }))}
                  placeholder="Ex: 123456789"
                  maxLength={9}
                />
              </div>
            </div>

            {/* Coluna direita â Obra */}
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-700">
                  Obra (opcional)
                  {folhaRosto.obraId && (
                    <span className="ml-2 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                      ligado â
                    </span>
                  )}
                </label>
                <Combobox
                  value={folhaRosto.obraNome ?? ""}
                  onChange={v => setFolhaRosto(p => ({ ...p, obraNome: v, obraId: null }))}
                  onSelect={item => setFolhaRosto(p => ({
                    ...p,
                    obraId:   item.id,
                    obraNome: item.nome,
                  }))}
                  placeholder="Pesquisar obraâ¦"
                  fetchOptions={fetchObras}
                  inputClassName={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-700">
                  Morada da obra (opcional)
                </label>
                <input type="text" className={inputCls}
                  value={folhaRosto.obraMorada ?? ""}
                  onChange={e => setFolhaRosto(p => ({ ...p, obraMorada: e.target.value }))}
                  placeholder="Rua, nÂº, localidade" />
              </div>
            </div>
          </div>

          {/* Segunda fila â datas, validade, referÃªncia, notas */}
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-700">Data da proposta</label>
              <input type="date" className={inputCls}
                value={folhaRosto.dataProposta}
                onChange={e => setFolhaRosto(p => ({ ...p, dataProposta: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-700">Validade (dias)</label>
              <input type="number" min={0} className={inputCls}
                value={folhaRosto.validadeDias}
                onChange={e => setFolhaRosto(p => ({ ...p, validadeDias: Number(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-700">ReferÃªncia interna</label>
              <input type="text" className={inputCls}
                value={folhaRosto.referenciaInterna ?? ""}
                onChange={e => setFolhaRosto(p => ({ ...p, referenciaInterna: e.target.value }))}
                placeholder="Ex.: PROJ-2026-01" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-700">Notas internas (opcional)</label>
              <input type="text" className={inputCls}
                value={folhaRosto.notas ?? ""}
                onChange={e => setFolhaRosto(p => ({ ...p, notas: e.target.value }))}
                placeholder="Notas internas sobre a proposta" />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Maria Orcamentista (em formaÃ§Ã£o)"
        subtitle="Assistente local para pesquisar e inserir linhas do catÃ¡logo.">
        <MariaPanel embed podeEditar={true}
          onInsertArtigo={(artigo, quantidade) => handleAddLinhaFromCatalogo(artigo, quantidade)} />
      </CollapsibleSection>

      <div className={catalogoLinhasLayout === "split"
        ? "flex flex-col gap-6 md:flex-row md:items-start"
        : "flex flex-col gap-6"}>
        <div className={catalogoLinhasLayout === "split"
          ? "w-full shrink-0 md:w-[min(380px,100%)] md:max-w-[380px]"
          : catalogoLinhasLayout === "linhasFull" ? "order-2 w-full" : "order-1 w-full"}>
          <CollapsibleSection title="CatÃ¡logo" headerActions={
            <button type="button"
              onClick={() => setCatalogoLinhasLayout(p => p === "catalogoFull" ? "split" : "catalogoFull")}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50">
              {catalogoLinhasLayout === "catalogoFull" ? "Vista dividida" : "Largura total"}
            </button>}>
            <CatalogoLateralPanel embed podeEditar={true} onSelectArtigo={handleSelectArtigo} />
          </CollapsibleSection>
        </div>
        <div className={catalogoLinhasLayout === "split"
          ? "min-w-0 flex-1"
          : catalogoLinhasLayout === "linhasFull" ? "order-1 w-full" : "order-2 w-full"}>
          <CollapsibleSection title="Linhas da proposta" headerActions={
            <button type="button"
              onClick={() => setCatalogoLinhasLayout(p => p === "linhasFull" ? "split" : "linhasFull")}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50">
              {catalogoLinhasLayout === "linhasFull" ? "Vista dividida" : "Largura total"}
            </button>}>
            <LinhasEditor embed linhas={linhas} onLinhasChange={setLinhas}
              podeEditar={true} fatorVenda={fatorVenda}
              onAddLinhaLivre={handleAddLinhaLivre} onRemoveLinha={handleRemoverLinha}
              onInsertImportedLines={handleInsertImportedLines}
              onSelectArtigoCatalogo={handleSelectArtigo} />
          </CollapsibleSection>
        </div>
      </div>

      <ResumoCapitulosPanel linhas={linhas} />

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="space-y-1 text-xs text-slate-600">
          <div><span className="font-medium text-slate-700">Total custo: </span>
            <span className="text-sm font-semibold text-slate-900">{formatCurrencyPt(totais.totalCusto)}</span></div>
          <div><span className="font-medium text-slate-700">Total venda: </span>
            <span className="text-sm font-semibold text-slate-900">{formatCurrencyPt(totais.totalVenda)}</span></div>
          <div><span className="font-medium text-slate-700">Margem: </span>
            <span className="text-sm font-semibold text-slate-900">
              {formatCurrencyPt(totais.margemValor)}{" "}
              <span className="text-[11px] text-slate-500">({totais.margemPercentagem.toFixed(1)}%)</span>
            </span></div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-700">Fator venda:</span>
            <input type="number" min={0} step="0.01"
              className="w-20 rounded border border-slate-200 px-2 py-1 text-right text-[11px] text-slate-800 outline-none focus:border-slate-400"
              value={fatorVenda}
              onChange={e => { const v = Number(e.target.value); setFatorVenda(Number.isFinite(v) && v > 0 ? v : 1.3); }} />
          </div>
          {error && <p className="text-[11px] text-red-600">{error}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleGuardar} disabled={isSaving}
            className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-500">
            {isSaving ? "A gravarâ¦" : "Guardar"}
          </button>
        </div>
      </section>
    </div>
  );
}
