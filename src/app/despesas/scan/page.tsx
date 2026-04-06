'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

const CATS = ['Material de obra','Ferramentas','Combustivel','Alimentacao','Subcontratacao','Transporte','Outros'];

interface Dados {
  fornecedor?: string; nif?: string; data?: string;
  valor_total?: number | null; valor_sem_iva?: number | null; iva?: number | null;
  descricao?: string; categoria?: string;
}

interface Obra { id: string; code: string; name: string; }

const inp: React.CSSProperties = {
  width:'100%', padding:'10px 12px', border:'1px solid #d1d5db',
  borderRadius:8, fontSize:15, boxSizing:'border-box', background:'#fff',
};

function Btn({ label, color, onClick, full, disabled }: {
  label:string; color:string; onClick?:()=>void; full?:boolean; disabled?:boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? '#9ca3af' : color, color:'#fff', border:'none',
      borderRadius:10, padding:'14px 20px', fontSize:15, fontWeight:600,
      cursor: disabled ? 'default' : 'pointer', width: full ? '100%' : undefined,
      flex: full ? undefined : 1, textAlign:'center',
    }}>{label}</button>
  );
}

export default function ScanDespesa() {
  const [preview, setPreview] = useState('');
  const [scanning, setScanning] = useState(false);
  const [dados, setDados] = useState<Dados | null>(null);
  const [centroCustoId, setCentroCustoId] = useState('');
  const [obras, setObras] = useState<Obra[]>([]);
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [erro, setErro] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/obras?limit=200')
      .then(r => r.json())
      .then(d => setObras(d.rows ?? []))
      .catch(() => {});
  }, []);

  const handleFile = async (f: File) => {
    setDados(null); setSaved(false); setErro('');
    setPreview(URL.createObjectURL(f));
    setScanning(true);
    try {
      const form = new FormData();
      form.append('file', f);
      const r = await fetch('/api/despesas/scan', { method:'POST', body:form });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Erro');
      setDados(j);
    } catch(e) {
      setErro(e instanceof Error ? e.message : 'Erro ao digitalizar');
    } finally {
      setScanning(false);
    }
  };

  const openCamera = () => {
    if (!inputRef.current) return;
    inputRef.current.setAttribute('capture','environment');
    inputRef.current.click();
  };

  const openFile = () => {
    if (!inputRef.current) return;
    inputRef.current.removeAttribute('capture');
    inputRef.current.click();
  };

  const guardar = async () => {
    if (!dados) return;
    setSaving(true); setErro('');
    try {
      const r = await fetch('/api/despesas/registar', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ ...dados, centro_custo_id: centroCustoId || null, notas }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Erro');
      setSaved(true);
    } catch(e) {
      setErro(e instanceof Error ? e.message : 'Erro ao guardar');
    } finally {
      setSaving(false);
    }
  };

  if (saved) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'100vh',padding:24,fontFamily:'sans-serif'}}>
      <div style={{fontSize:72}}>✅</div>
      <h2 style={{color:'#065f46',margin:'16px 0 8px'}}>Despesa registada!</h2>
      <Btn label="Nova despesa" color="#2563eb" onClick={() => {
        setPreview(''); setDados(null); setSaved(false); setCentroCustoId(''); setNotas(''); setErro('');
      }} />
      <Link href="/despesas" style={{marginTop:16,color:'#6b7280',fontSize:14}}>Ver todas as despesas</Link>
    </div>
  );

  return (
    <div style={{maxWidth:480,margin:'0 auto',padding:20,fontFamily:'sans-serif',paddingBottom:80}}>
      <div style={{marginBottom:20}}>
        <Link href="/despesas" style={{color:'#6b7280',fontSize:14,textDecoration:'none'}}>&larr; Despesas</Link>
        <h1 style={{fontSize:22,fontWeight:700,margin:'8px 0 2px'}}>Digitalizar Factura / Recibo</h1>
        <p style={{color:'#6b7280',fontSize:14,margin:0}}>Fotografa ou carrega &mdash; a IA extrai os dados automaticamente</p>
      </div>

      {!preview && (
        <div style={{display:'flex',gap:12,marginBottom:24}}>
          <Btn label="Camara" color="#2563eb" onClick={openCamera} />
          <Btn label="Ficheiro" color="#374151" onClick={openFile} />
          <input ref={inputRef} type="file" accept="image/*,application/pdf"
            style={{display:'none'}}
            onChange={e => { const f=e.target.files?.[0]; if(f) handleFile(f); e.target.value=''; }}
          />
        </div>
      )}

      {preview && (
        <div style={{marginBottom:16,position:'relative'}}>
          <img src={preview} alt="Documento" style={{width:'100%',borderRadius:12,maxHeight:240,objectFit:'cover'}} />
          <button onClick={() => { setPreview(''); setDados(null); setErro(''); }}
            style={{position:'absolute',top:8,right:8,background:'rgba(0,0,0,0.55)',color:'#fff',border:'none',borderRadius:16,padding:'4px 10px',cursor:'pointer',fontSize:13}}>
            Mudar
          </button>
        </div>
      )}

      {scanning && (
        <div style={{textAlign:'center',padding:32,color:'#6b7280'}}>
          <div style={{fontSize:36,marginBottom:8}}>🔍</div>
          <p style={{margin:0}}>A analisar com IA...</p>
        </div>
      )}

      {erro && (
        <div style={{background:'#fee2e2',border:'1px solid #fca5a5',borderRadius:8,padding:12,marginBottom:16,color:'#991b1b',fontSize:14}}>
          {erro}
        </div>
      )}

      {dados && !scanning && (
        <div>
          <div style={{background:'#f0fdf4',border:'1px solid #86efac',borderRadius:8,padding:10,marginBottom:16,fontSize:13,color:'#166534'}}>
            Dados extraidos automaticamente &mdash; confirma ou corrige antes de guardar
          </div>

          {([
            {label:'Fornecedor', key:'fornecedor', type:'text'},
            {label:'NIF',        key:'nif',        type:'text'},
            {label:'Data',       key:'data',       type:'date'},
            {label:'Valor total (c/ IVA)', key:'valor_total',   type:'number'},
            {label:'Valor sem IVA',        key:'valor_sem_iva', type:'number'},
            {label:'Taxa IVA (%)',          key:'iva',           type:'number'},
            {label:'Descricao',            key:'descricao',     type:'text'},
          ] as {label:string; key:keyof Dados; type:string}[]).map(({label,key,type}) => (
            <div key={key} style={{marginBottom:12}}>
              <label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:4}}>{label}</label>
              <input type={type} style={inp}
                value={(dados?.[key] ?? '') as string}
                onChange={e => setDados(prev => ({
                  ...prev,
                  [key]: type==='number' ? (parseFloat(e.target.value)||null) : e.target.value
                }))}
              />
            </div>
          ))}

          <div style={{marginBottom:12}}>
            <label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:4}}>Categoria</label>
            <select style={inp} value={dados?.categoria||''} onChange={e => setDados(p=>({...p,categoria:e.target.value}))}>
              <option value="">Seleciona...</option>
              {CATS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{marginBottom:12}}>
            <label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:4}}>Centro de custo / Obra</label>
            <select style={inp} value={centroCustoId} onChange={e => setCentroCustoId(e.target.value)}>
              <option value="">Geral (sem obra)</option>
              {obras.map(o => <option key={o.id} value={o.id}>{o.code} &mdash; {o.name}</option>)}
            </select>
          </div>

          <div style={{marginBottom:20}}>
            <label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:4}}>Notas adicionais</label>
            <textarea style={{...inp,resize:'vertical'} as React.CSSProperties} rows={2}
              value={notas} onChange={e=>setNotas(e.target.value)} />
          </div>

          <Btn label={saving ? 'A guardar...' : 'Guardar despesa'} color="#16a34a"
            onClick={guardar} full disabled={saving} />
        </div>
      )}
    </div>
  );
}
