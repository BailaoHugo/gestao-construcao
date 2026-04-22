'use client';
import { useState, useRef, useEffect } from 'react';
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

export default function ScanDespesa() {
  const [preview, setPreview] = useState('');
  const [previewType, setPreviewType] = useState<'image' | 'pdf'>('image');
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [documentoUrl, setDocumentoUrl] = useState('');
  const [dados, setDados] = useState<Dados | null>(null);
  const [centroCustoId, setCentroCustoId] = useState('');
  const [obras, setObras] = useState<Obra[]>([]);
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [duplicado, setDuplicado] = useState<{ id: number; fornecedor: string | null; data_despesa: string; valor: string } | null>(null);
  const [erro, setErro] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/obras?limit=200')
      .then(r => r.json())
      .then(d => setObras(d.data ?? d.items ?? d.rows ?? []))
      .catch(() => {});
  }, []);

  const handleFile = async (f: File) => {
    setDados(null); setSaved(false); setErro(''); setDocumentoUrl('');
    const isPdf = f.type === 'application/pdf';
    setPreviewType(isPdf ? 'pdf' : 'image');
    setPreview(isPdf ? f.name : URL.createObjectURL(f));

    // Upload e scan em paralelo
    setUploading(true);
    setScanning(true);

    // Usar dois FormData separados -- o mesmo objecto nao pode ser lido em paralelo
    const formUpload = new FormData();
    formUpload.append('file', f);
    const formScan = new FormData();
    formScan.append('file', f);

    const [uploadRes, scanRes] = await Promise.allSettled([
      fetch('/api/upload', { method: 'POST', body: formUpload }),
      fetch('/api/despesas/scan', { method: 'POST', body: formScan }),
    ]);

    // Processar upload
    if (uploadRes.status === 'fulfilled' && uploadRes.value.ok) {
      try {
        const j = await uploadRes.value.json();
        if (j.url) setDocumentoUrl(j.url);
      } catch { /* ignore */ }
    } else {
      console.warn('[scan] Upload falhou');
      setErro('Aviso: o documento nao foi guardado (erro no upload). Podes guardar na mesma, mas sem anexo.');
    }
    setUploading(false);

    // Processar scan
    if (scanRes.status === 'fulfilled') {
      try {
        const j = await scanRes.value.json();
        if (!scanRes.value.ok) throw new Error(j.error || 'Erro');
        setDados(j);
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao digitalizar');
      }
    } else {
      setErro('Erro de rede ao digitalizar');
    }
    setScanning(false);
  };

  const openCamera = () => {
    if (!inputRef.current) return;
    inputRef.current.setAttribute('capture', 'environment');
    inputRef.current.click();
  };

  const openFile = () => {
    if (!inputRef.current) return;
    inputRef.current.removeAttribute('capture');
    inputRef.current.click();
  };

  const guardar = async (forcar = false) => {
    if (!dados) return;
    if (!centroCustoId) { setErro('Seleciona o centro de custo antes de guardar.'); return; }
    setSaving(true); setErro(''); setDuplicado(null);
    try {
      const r = await fetch('/api/despesas/registar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...dados,
          centro_custo_id: centroCustoId || null,
          notas,
          documento_ref: documentoUrl || null,
          forcar,
        }),
      });
      const j = await r.json();
      if (r.status === 409 && j.duplicate) {
        setDuplicado(j.existing);
        return;
      }
      if (!r.ok) throw new Error(j.error || 'Erro');
      setSavedId(j.id ?? null);
      setSaved(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao guardar');
    } finally {
      setSaving(false);
    }
  };

  const resetAll = () => {
    setPreview(''); setDados(null); setSaved(false);
    setCentroCustoId(''); setNotas(''); setErro(''); setDocumentoUrl(''); setSavedId(null); setDuplicado(null);
  };

  // ── Ecrã de sucesso ─────────────────────────────────────────────────────────
  if (saved) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border shadow-sm p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Despesa registada!</h2>
          <p className="text-sm text-gray-500 mb-6">O documento foi guardado com sucesso.</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={resetAll}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium"
            >
              Nova despesa
            </button>
            <Link
              href="/despesas"
              className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-2.5 rounded-lg text-sm font-medium text-center"
            >
              Ver todas as despesas
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulário principal ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto p-4 pb-12">

        {/* Header */}
        <div className="mb-5">
          <Link href="/despesas" className="text-sm text-gray-500 hover:text-gray-700">
            ← Despesas
          </Link>
          <h1 className="text-xl font-bold text-gray-900 mt-2">Digitalizar Factura / Recibo</h1>
          <p className="text-sm text-gray-500">Fotografa ou carrega — a IA extrai os dados automaticamente</p>
        </div>

        {/* Botões de captura */}
        {!preview && (
          <div className="flex gap-3 mb-5">
            <button
              onClick={openCamera}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-sm font-medium"
            >
              📷 Câmara
            </button>
            <button
              onClick={openFile}
              className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-3 rounded-lg text-sm font-medium"
            >
              📎 Ficheiro
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = '';
              }}
            />
          </div>
        )}

        {/* Preview do documento */}
        {preview && (
          <div className="mb-4 relative bg-white border rounded-lg overflow-hidden">
            {previewType === 'image' ? (
              <img src={preview} alt="Documento" className="w-full max-h-56 object-cover" />
            ) : (
              <div className="flex items-center gap-3 p-4">
                <span className="text-3xl">📄</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{preview}</p>
                  <p className="text-xs text-gray-500">PDF</p>
                </div>
              </div>
            )}
            {(uploading || scanning) && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl mb-1">🔍</div>
                  <p className="text-sm text-gray-600">A analisar com IA...</p>
                </div>
              </div>
            )}
            {!uploading && !scanning && (
              <button
                onClick={resetAll}
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white text-xs px-2.5 py-1 rounded-full"
              >
                Mudar
              </button>
            )}
          </div>
        )}

        {/* Erro */}
        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            {erro}
          </div>
        )}

        {/* Formulário de dados extraídos */}
        {dados && !scanning && (
          <div className="bg-white border rounded-lg divide-y">
            {/* Banner de confirmação */}
            <div className="bg-green-50 px-4 py-2.5 flex items-center gap-2">
              <span className="text-green-600 text-sm">✓</span>
              <p className="text-xs text-green-700 font-medium flex-1">
                Dados extraídos — confirma ou corrige antes de guardar
              </p>
              {dados.qr_atcud && (
                <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full font-medium" title={dados.qr_atcud ?? ''}>
                  QR ✓
                </span>
              )}
            </div>

            <div className="p-4 space-y-3">
              {/* Fornecedor */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Fornecedor</label>
                <input
                  type="text"
                  value={dados.fornecedor ?? ''}
                  onChange={e => setDados(p => ({ ...p, fornecedor: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Nº Fatura */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nº Fatura</label>
                <input
                  type="text"
                  value={dados.numero_fatura ?? ''}
                  onChange={e => setDados(p => ({ ...p, numero_fatura: e.target.value }))}
                  placeholder="ex: FT 2024/123"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {/* NIF + NIF Comprador + Data */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">NIF Forn.</label>
                  <input
                    type="text"
                    value={dados.nif ?? ''}
                    onChange={e => setDados(p => ({ ...p, nif: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">NIF Comp.</label>
                  <input
                    type="text"
                    value={dados.nif_comprador ?? ''}
                    onChange={e => setDados(p => ({ ...p, nif_comprador: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Data</label>
                  <input
                    type="date"
                    value={dados.data ?? ''}
                    onChange={e => setDados(p => ({ ...p, data: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Valor total + IVA + Sem IVA */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Total c/ IVA (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={dados.valor_total ?? ''}
                    onChange={e => setDados(p => ({ ...p, valor_total: parseFloat(e.target.value) || null }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Sem IVA (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={dados.valor_sem_iva ?? ''}
                    onChange={e => setDados(p => ({ ...p, valor_sem_iva: parseFloat(e.target.value) || null }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">IVA (%)</label>
                  <input
                    type="number"
                    value={dados.iva ?? ''}
                    onChange={e => setDados(p => ({ ...p, iva: parseFloat(e.target.value) || null }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Linhas da fatura */}
              {dados.linhas && dados.linhas.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Linhas da fatura</label>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-2 py-1.5 text-gray-500 font-medium w-[40%]">Descrição</th>
                          <th className="text-right px-2 py-1.5 text-gray-500 font-medium">Qtd</th>
                          <th className="text-left px-2 py-1.5 text-gray-500 font-medium">Un</th>
                          <th className="text-right px-2 py-1.5 text-gray-500 font-medium">P.Unit</th>
                          <th className="text-right px-2 py-1.5 text-gray-500 font-medium">Desc%</th>
                          <th className="text-right px-2 py-1.5 text-gray-500 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {dados.linhas.map((l, i) => (
                          <tr key={i}>
                            <td className="px-2 py-1">
                              <input
                                type="text"
                                value={l.descricao}
                                onChange={e => setDados(p => {
                                  const ls = [...(p?.linhas ?? [])];
                                  ls[i] = { ...ls[i], descricao: e.target.value };
                                  return { ...p, linhas: ls };
                                })}
                                className="w-full bg-transparent focus:outline-none focus:bg-blue-50 rounded px-1"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input
                                type="number"
                                value={l.quantidade ?? ''}
                                onChange={e => setDados(p => {
                                  const ls = [...(p?.linhas ?? [])];
                                  ls[i] = { ...ls[i], quantidade: parseFloat(e.target.value) || null };
                                  return { ...p, linhas: ls };
                                })}
                                className="w-16 text-right bg-transparent focus:outline-none focus:bg-blue-50 rounded px-1"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input
                                type="text"
                                value={l.unidade ?? ''}
                                onChange={e => setDados(p => {
                                  const ls = [...(p?.linhas ?? [])];
                                  ls[i] = { ...ls[i], unidade: e.target.value };
                                  return { ...p, linhas: ls };
                                })}
                                className="w-12 bg-transparent focus:outline-none focus:bg-blue-50 rounded px-1"
                              />
                            </td>
                            <td className="px-2 py-1 text-right">
                              <input
                                type="number"
                                step="0.01"
                                value={l.preco_unitario ?? ''}
                                onChange={e => setDados(p => {
                                  const ls = [...(p?.linhas ?? [])];
                                  ls[i] = { ...ls[i], preco_unitario: parseFloat(e.target.value) || null };
                                  return { ...p, linhas: ls };
                                })}
                                className="w-20 text-right bg-transparent focus:outline-none focus:bg-blue-50 rounded px-1"
                              />
                            </td>
                            <td className="px-2 py-1 text-right">
                              <input
                                type="number"
                                step="1"
                                value={l.desconto_pct ?? ""}
                                onChange={e => setDados(p => {
                                  const ls = [...(p?.linhas ?? [])];
                                  ls[i] = { ...ls[i], desconto_pct: parseFloat(e.target.value) || null };
                                  return { ...p, linhas: ls };
                                })}
                                className="w-14 text-right bg-transparent focus:outline-none focus:bg-blue-50 rounded px-1"
                              />
                            </td>
                            <td className="px-2 py-1 text-right font-medium text-gray-700">
                              {l.total != null ? l.total.toFixed(2) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {/* Descrição */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Descrição</label>
                <input
                  type="text"
                  value={dados.descricao ?? ''}
                  onChange={e => setDados(p => ({ ...p, descricao: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Categoria</label>
                <select
                  value={dados.categoria ?? ''}
                  onChange={e => setDados(p => ({ ...p, categoria: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleciona...</option>
                  {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Obra */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Centro de custo / Obra</label>
                <select
                  value={centroCustoId}
                  onChange={e => setCentroCustoId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Geral (sem obra)</option>
                  {obras.map(o => (
                    <option key={o.id} value={o.id}>{o.code} — {o.nome}</option>
                  ))}
                </select>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Notas adicionais</label>
                <textarea
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Indicador do documento anexado */}
              {documentoUrl && (
                <div className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
                  <span className="text-gray-400 text-sm">📎</span>
                  <span className="text-xs text-gray-600 flex-1 truncate">Documento anexado</span>
                  <span className="text-xs text-green-600 shrink-0">✓</span>
                </div>
              )}
              {uploading && !documentoUrl && (
                <div className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
                  <span className="text-gray-400 text-sm">📎</span>
                  <span className="text-xs text-gray-500">A guardar documento...</span>
                </div>
              )}
            </div>

            {/* Duplicado warning */}
            {duplicado && (
              <div className="mx-4 mb-0 mt-0 p-3 bg-amber-50 border border-amber-300 rounded-lg">
                <p className="text-xs font-semibold text-amber-800 mb-1">⚠ Fatura já registada</p>
                <p className="text-xs text-amber-700">
                  Nº fatura já existe: <span className="font-medium">{duplicado.fornecedor ?? '—'}</span> · {duplicado.data_despesa} · {Number(duplicado.valor).toFixed(2)} €
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setDuplicado(null)}
                    className="flex-1 border border-amber-400 text-amber-800 text-xs py-1.5 rounded-lg hover:bg-amber-100"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => guardar(true)}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs py-1.5 rounded-lg font-medium"
                  >
                    Guardar mesmo assim
                  </button>
                </div>
              </div>
            )}
            {/* Erros e botão guardar */}
            <div className="p-4">
              {erro && (
                <p className="text-xs text-red-500 mb-3">{erro}</p>
              )}
              {!centroCustoId && dados && (
                <p className="text-xs text-amber-600 mb-2">⚠ Seleciona um centro de custo para guardar</p>
              )}
              <button
                onClick={() => guardar(false)}
                disabled={saving || uploading || !centroCustoId}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-3 rounded-lg text-sm font-medium"
              >
                {saving ? 'A guardar...' : uploading ? 'A processar documento...' : 'Guardar despesa'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
