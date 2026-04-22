'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { ObraCombobox } from '@/components/ObraCombobox';
import Link from 'next/link';

const CATS = [
  'Material de obra',
  'Ferramentas',
  'Subempreitada',
  'Prestação de serviços',
  'Combustivel',
  'Alimentacao',
  'Transporte',
  'Outros',
];

interface Linha {
  descricao: string;
  quantidade: number | null;
  unidade: string | null;
  preco_unitario: number | null;
  desconto_pct: number | null;
  total: number | null;
}

interface Dados {
  qr_atcud?: string | null;
  fornecedor?: string;
  nif?: string;
  nif_comprador?: string | null;
  numero_fatura?: string | null;
  data?: string;
  valor_total?: number | null;
  valor_sem_iva?: number | null;
  iva?: number | null;
  descricao?: string;
  categoria?: string;
  linhas?: Linha[];
}

interface Obra { id: string; code: string; nome: string; }

type ItemStatus = 'pending' | 'processing' | 'ready' | 'saving' | 'saved' | 'error';

interface QueueItem {
  id: string;
  file: File;
  status: ItemStatus;
  preview: string;
  previewType: 'image' | 'pdf';
  documentoUrl: string;
  dados: Dados | null;
  centroCustoId: string;
  notas: string;
  erro: string;
  savedId: string | null;
  duplicado: { id: number; fornecedor: string | null; data_despesa: string; valor: string } | null;
}

// ── Card de item individual ──────────────────────────────────────────────────
function ItemCard({
  item, obras,
  onUpdate, onSave, onForce, onRemove,
}: {
  item: QueueItem;
  obras: Obra[];
  onUpdate: (updates: Partial<QueueItem>) => void;
  onSave: () => void;
  onForce: () => void;
  onRemove: () => void;
}) {
  const setDados = (fn: (prev: Dados) => Dados) => {
    onUpdate({ dados: fn(item.dados ?? {}) });
  };

  const statusColor = {
    pending: 'bg-gray-100 text-gray-500',
    processing: 'bg-blue-100 text-blue-700',
    ready: 'bg-amber-100 text-amber-700',
    saving: 'bg-blue-100 text-blue-700',
    saved: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
  }[item.status];

  const statusLabel = {
    pending: 'Em fila',
    processing: 'A digitalizar...',
    ready: 'Pronto para guardar',
    saving: 'A guardar...',
    saved: 'Guardado ✓',
    error: 'Erro',
  }[item.status];

  return (
    <div className={`bg-white border rounded-xl overflow-hidden ${item.status === 'saved' ? 'opacity-60' : ''}`}>
      {/* Header do card */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-gray-50">
        <span className="text-lg">{item.previewType === 'pdf' ? '📄' : '🖼️'}</span>
        <p className="text-sm font-medium text-gray-800 flex-1 truncate">{item.file.name}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColor}`}>
          {statusLabel}
        </span>
        {(item.status === 'ready' || item.status === 'error' || item.status === 'saved') && (
          <button onClick={onRemove} className="text-gray-400 hover:text-gray-600 text-lg leading-none shrink-0">×</button>
        )}
      </div>

      {/* Estado: a processar */}
      {(item.status === 'pending' || item.status === 'processing') && (
        <div className="flex items-center gap-3 p-6 text-gray-500">
          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
          <span className="text-sm">{item.status === 'pending' ? 'Em fila de espera...' : 'A analisar com IA...'}</span>
        </div>
      )}

      {/* Estado: erro */}
      {item.status === 'error' && (
        <div className="p-4 text-sm text-red-600">{item.erro || 'Erro ao digitalizar'}</div>
      )}

      {/* Estado: pronto / a guardar / guardado */}
      {item.dados && (item.status === 'ready' || item.status === 'saving' || item.status === 'saved') && (
        <div className="p-4 space-y-3">
          {/* Banner QR */}
          {item.dados.qr_atcud && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <span className="text-xs text-green-700 font-medium">QR ✓</span>
              <span className="text-xs text-green-600 truncate">{item.dados.qr_atcud}</span>
            </div>
          )}

          {/* Fornecedor + Nº Fatura */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Fornecedor</label>
              <input type="text" value={item.dados.fornecedor ?? ''}
                onChange={e => setDados(p => ({ ...p, fornecedor: e.target.value }))}
                disabled={item.status === 'saved'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nº Fatura</label>
              <input type="text" value={item.dados.numero_fatura ?? ''}
                onChange={e => setDados(p => ({ ...p, numero_fatura: e.target.value }))}
                disabled={item.status === 'saved'}
                placeholder="ex: FT 2024/123"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50" />
            </div>
          </div>

          {/* NIF + NIF Comprador + Data */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">NIF Forn.</label>
              <input type="text" value={item.dados.nif ?? ''}
                onChange={e => setDados(p => ({ ...p, nif: e.target.value }))}
                disabled={item.status === 'saved'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">NIF Comp.</label>
              <input type="text" value={item.dados.nif_comprador ?? ''}
                onChange={e => setDados(p => ({ ...p, nif_comprador: e.target.value }))}
                disabled={item.status === 'saved'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Data</label>
              <input type="date" value={item.dados.data ?? ''}
                onChange={e => setDados(p => ({ ...p, data: e.target.value }))}
                disabled={item.status === 'saved'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50" />
            </div>
          </div>

          {/* Valores */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Total c/ IVA (€)</label>
              <input type="number" step="0.01" value={item.dados.valor_total ?? ''}
                onChange={e => setDados(p => ({ ...p, valor_total: parseFloat(e.target.value) || null }))}
                disabled={item.status === 'saved'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Sem IVA (€)</label>
              <input type="number" step="0.01" value={item.dados.valor_sem_iva ?? ''}
                onChange={e => setDados(p => ({ ...p, valor_sem_iva: parseFloat(e.target.value) || null }))}
                disabled={item.status === 'saved'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">IVA (%)</label>
              <input type="number" value={item.dados.iva ?? ''}
                onChange={e => setDados(p => ({ ...p, iva: parseFloat(e.target.value) || null }))}
                disabled={item.status === 'saved'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50" />
            </div>
          </div>

          {/* Linhas */}
          {item.dados.linhas && item.dados.linhas.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Linhas</label>
              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-2 py-1.5 text-gray-500 font-medium">Descrição</th>
                      <th className="text-right px-2 py-1.5 text-gray-500 font-medium">Qtd</th>
                      <th className="text-right px-2 py-1.5 text-gray-500 font-medium">P.Unit</th>
                      <th className="text-right px-2 py-1.5 text-gray-500 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {item.dados.linhas.map((l, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1 text-gray-700 max-w-[160px] truncate">{l.descricao}</td>
                        <td className="px-2 py-1 text-right text-gray-600">{l.quantidade ?? '—'}</td>
                        <td className="px-2 py-1 text-right text-gray-600">{l.preco_unitario != null ? l.preco_unitario.toFixed(2) : '—'}</td>
                        <td className="px-2 py-1 text-right font-medium text-gray-800">{l.total != null ? l.total.toFixed(2) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Categoria */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Categoria</label>
              <select value={item.dados.categoria ?? ''}
                onChange={e => setDados(p => ({ ...p, categoria: e.target.value }))}
                disabled={item.status === 'saved'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50">
                <option value="">Seleciona...</option>
                {CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Centro de custo</label>
              {item.status === 'saved' ? (
                <div className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 bg-gray-50">
                  {obras.find(o => o.id === item.centroCustoId)?.nome ?? '—'}
                </div>
              ) : (
                <ObraCombobox obras={obras} value={item.centroCustoId}
                  onChange={v => onUpdate({ centroCustoId: v })}
                  emptyLabel="Seleciona obra..." className="w-full" />
              )}
            </div>
          </div>

          {/* Notas */}
          {item.status !== 'saved' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Notas</label>
              <textarea value={item.notas} onChange={e => onUpdate({ notas: e.target.value })}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
          )}

          {/* Documento anexado */}
          {item.documentoUrl && (
            <div className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
              <span className="text-gray-400 text-sm">📎</span>
              <span className="text-xs text-gray-600 flex-1">Documento anexado</span>
              <span className="text-xs text-green-600">✓</span>
            </div>
          )}

          {/* Erro inline */}
          {item.erro && (
            <p className="text-xs text-red-500">{item.erro}</p>
          )}

          {/* Alerta de duplicado */}
          {item.duplicado && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg">
              <p className="text-xs font-semibold text-amber-800 mb-1">⚠ Fatura já registada</p>
              <p className="text-xs text-amber-700">
                {item.duplicado.fornecedor ?? '—'} · {item.duplicado.data_despesa} · {Number(item.duplicado.valor).toFixed(2)} €
              </p>
              <div className="flex gap-2 mt-2">
                <button onClick={() => onUpdate({ duplicado: null })}
                  className="flex-1 border border-amber-400 text-amber-800 text-xs py-1.5 rounded-lg hover:bg-amber-100">
                  Cancelar
                </button>
                <button onClick={onForce}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs py-1.5 rounded-lg font-medium">
                  Guardar mesmo assim
                </button>
              </div>
            </div>
          )}

          {/* Botão guardar */}
          {item.status === 'ready' && !item.duplicado && (
            <button onClick={onSave} disabled={!item.centroCustoId}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-2.5 rounded-lg text-sm font-medium">
              {!item.centroCustoId ? 'Seleciona centro de custo' : 'Guardar despesa'}
            </button>
          )}

          {item.status === 'saving' && (
            <div className="w-full bg-gray-100 text-gray-500 py-2.5 rounded-lg text-sm text-center">A guardar...</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function ScanDespesa() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [centroCustoGlobal, setCentroCustoGlobal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    fetch('/api/obras?limit=200')
      .then(r => r.json())
      .then(d => setObras(d.data ?? d.items ?? d.rows ?? []))
      .catch(() => {});
  }, []);

  // Processar item individual
  const processItem = useCallback(async (item: QueueItem) => {
    setQueue(q => q.map(it => it.id === item.id ? { ...it, status: 'processing' } : it));

    let documentoUrl = '';
    let dados: Dados | null = null;
    let erro = '';

    try {
      const fileBytes = await item.file.arrayBuffer();
      const blob1 = new Blob([fileBytes], { type: item.file.type });
      const blob2 = new Blob([fileBytes], { type: item.file.type });
      const formUpload = new FormData();
      formUpload.append('file', blob1, item.file.name);
      const formScan = new FormData();
      formScan.append('file', blob2, item.file.name);

      const [uploadRes, scanRes] = await Promise.allSettled([
        fetch('/api/upload', { method: 'POST', body: formUpload }),
        fetch('/api/despesas/scan', { method: 'POST', body: formScan }),
      ]);

      if (uploadRes.status === 'fulfilled' && uploadRes.value.ok) {
        try { const j = await uploadRes.value.json(); if (j.url) documentoUrl = j.url; } catch { /* ignore */ }
      }

      if (scanRes.status === 'fulfilled') {
        try {
          const j = await scanRes.value.json();
          if (!scanRes.value.ok) throw new Error(j.error || 'Erro');
          dados = j;
        } catch (e) {
          erro = e instanceof Error ? e.message : 'Erro ao digitalizar';
        }
      } else {
        erro = 'Erro de rede ao digitalizar';
      }
    } catch (e) {
      erro = e instanceof Error ? e.message : 'Erro';
    }

    setQueue(q => q.map(it => it.id === item.id ? {
      ...it,
      status: dados ? 'ready' : 'error',
      documentoUrl,
      dados,
      erro,
    } : it));

    processingRef.current = false;
  }, []);

  // Fila sequencial: processar o próximo item pendente
  useEffect(() => {
    if (processingRef.current) return;
    const pending = queue.find(it => it.status === 'pending');
    if (!pending) return;
    processingRef.current = true;
    processItem(pending);
  }, [queue, processItem]);

  const addFiles = (files: FileList | File[]) => {
    const newItems: QueueItem[] = Array.from(files).map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      status: 'pending' as ItemStatus,
      preview: file.type === 'application/pdf' ? file.name : URL.createObjectURL(file),
      previewType: file.type === 'application/pdf' ? 'pdf' : 'image',
      documentoUrl: '',
      dados: null,
      centroCustoId: centroCustoGlobal,
      notas: '',
      erro: '',
      savedId: null,
      duplicado: null,
    }));
    setQueue(q => [...q, ...newItems]);
  };

  const updateItem = (id: string, updates: Partial<QueueItem>) => {
    setQueue(q => q.map(it => it.id === id ? { ...it, ...updates } : it));
  };

  const guardarItem = async (item: QueueItem, forcar = false) => {
    if (!item.dados) return;
    if (!item.centroCustoId) { updateItem(item.id, { erro: 'Seleciona o centro de custo.' }); return; }
    updateItem(item.id, { status: 'saving', erro: '', duplicado: null });
    try {
      const r = await fetch('/api/despesas/registar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...item.dados,
          centro_custo_id: item.centroCustoId || null,
          notas: item.notas,
          documento_ref: item.documentoUrl || null,
          forcar,
        }),
      });
      const j = await r.json();
      if (r.status === 409 && j.duplicate) {
        updateItem(item.id, { status: 'ready', duplicado: j.existing });
        return;
      }
      if (!r.ok) throw new Error(j.error || 'Erro');
      updateItem(item.id, { status: 'saved', savedId: j.id ?? null });
    } catch (e) {
      updateItem(item.id, { status: 'ready', erro: e instanceof Error ? e.message : 'Erro ao guardar' });
    }
  };

  const guardarTodos = async () => {
    const ready = queue.filter(it => it.status === 'ready' && it.centroCustoId && !it.duplicado);
    for (const item of ready) {
      await guardarItem(item);
    }
  };

  const readyCount = queue.filter(it => it.status === 'ready').length;
  const savedCount = queue.filter(it => it.status === 'saved').length;
  const processingCount = queue.filter(it => it.status === 'processing' || it.status === 'pending').length;
  const allDone = queue.length > 0 && queue.every(it => it.status === 'saved' || it.status === 'error');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-4 pb-24">

        {/* Header */}
        <div className="mb-5">
          <Link href="/despesas" className="text-sm text-gray-500 hover:text-gray-700">← Despesas</Link>
          <h1 className="text-xl font-bold text-gray-900 mt-2">Digitalizar Facturas</h1>
          <p className="text-sm text-gray-500">Carrega uma ou várias faturas — a IA extrai os dados automaticamente</p>
        </div>

        {/* Drop zone */}
        <div
          className="border-2 border-dashed border-gray-300 rounded-xl p-6 mb-5 text-center hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer transition-colors"
          onClick={() => { if (inputRef.current) { inputRef.current.removeAttribute('capture'); inputRef.current.click(); } }}
          onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-blue-400', 'bg-blue-50/50'); }}
          onDragLeave={e => { e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50/50'); }}
          onDrop={e => {
            e.preventDefault();
            e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50/50');
            if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
          }}
        >
          <div className="text-3xl mb-2">📂</div>
          <p className="text-sm font-medium text-gray-700">Arrasta ficheiros ou clica para selecionar</p>
          <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG — várias faturas de uma vez</p>
          <div className="flex justify-center gap-3 mt-3">
            <button
              onClick={e => { e.stopPropagation(); if (inputRef.current) { inputRef.current.setAttribute('capture', 'environment'); inputRef.current.click(); } }}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg"
            >
              📷 Câmara
            </button>
            <span className="text-xs bg-white border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg">📎 Ficheiros</span>
          </div>
          <input ref={inputRef} type="file" accept="image/*,application/pdf" multiple className="hidden"
            onChange={e => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ''; }} />
        </div>

        {/* Centro de custo global (só aparece com >1 ficheiro) */}
        {queue.filter(it => it.status !== 'saved').length > 1 && (
          <div className="bg-white border rounded-xl p-4 mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Aplicar a todas as faturas pendentes: Centro de custo
            </label>
            <ObraCombobox obras={obras} value={centroCustoGlobal} onChange={v => {
              setCentroCustoGlobal(v);
              setQueue(q => q.map(it => it.status !== 'saved' ? { ...it, centroCustoId: v } : it));
            }} emptyLabel="Seleciona obra..." className="w-full" />
          </div>
        )}

        {/* Stats */}
        {queue.length > 0 && (
          <div className="flex items-center gap-3 mb-4 text-xs text-gray-500">
            <span>{queue.length} ficheiro{queue.length !== 1 ? 's' : ''}</span>
            {processingCount > 0 && <span className="text-blue-600">· {processingCount} a processar</span>}
            {readyCount > 0 && <span className="text-amber-600">· {readyCount} {readyCount === 1 ? 'pronto' : 'prontos'}</span>}
            {savedCount > 0 && <span className="text-green-600">· {savedCount} guardados</span>}
          </div>
        )}

        {/* Cards */}
        <div className="space-y-4">
          {queue.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              obras={obras}
              onUpdate={updates => updateItem(item.id, updates)}
              onSave={() => guardarItem(item)}
              onForce={() => guardarItem(item, true)}
              onRemove={() => setQueue(q => q.filter(it => it.id !== item.id))}
            />
          ))}
        </div>

        {/* Ecrã de conclusão */}
        {allDone && savedCount > 0 && (
          <div className="mt-6 bg-white border rounded-xl p-6 text-center">
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              {savedCount} despesa{savedCount !== 1 ? 's' : ''} registada{savedCount !== 1 ? 's' : ''}!
            </h2>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setQueue([])}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium">
                Nova digitalização
              </button>
              <Link href="/despesas"
                className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-2.5 rounded-lg text-sm font-medium text-center">
                Ver despesas
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Barra flutuante: Guardar todos */}
      {readyCount > 1 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
          <div className="max-w-2xl mx-auto">
            <button onClick={guardarTodos}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-sm font-semibold">
              Guardar {readyCount} despesas de uma vez
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
