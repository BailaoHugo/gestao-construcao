// Parser do conteudo de um QR code ATCUD (facturas portuguesas).
//
// Formato tipico:
//   A:NIF_EMITENTE*B:NIF_COMPRADOR*C:PT*D:FT*E:N*F:YYYYMMDD*G:NUM_DOC*H:ATCUD*...*N:IVA_TOTAL*O:TOTAL*Q:HASH*R:CERT
//
// Referencia: Portaria 195/2020 - QR code da Autoridade Tributaria.

export interface AtcudData {
  raw: string;
  nif_emitente: string | null;       // A:
  nif_comprador: string | null;      // B:
  pais_comprador: string | null;     // C:
  tipo_documento: string | null;     // D: FT/FS/FR/NC/ND/NQ
  estado_documento: string | null;   // E:
  data: string | null;               // F: YYYY-MM-DD (vem como YYYYMMDD no QR)
  numero_documento: string | null;   // G:
  atcud: string | null;              // H:
  iva_total: number | null;          // N:
  total: number | null;              // O:
  hash: string | null;               // Q:
  cert: string | null;               // R:
}

export function parseAtcud(raw: string): AtcudData | null {
  if (!raw || typeof raw !== 'string') return null;

  // Validacao minima: deve ter pelo menos os campos A: e D:
  if (!/A:\d+/.test(raw) || !/D:[A-Z]{2}/.test(raw)) return null;

  const fields: Record<string, string> = {};
  raw.split('*').forEach(part => {
    const idx = part.indexOf(':');
    if (idx > 0) {
      const key = part.slice(0, idx).trim();
      const val = part.slice(idx + 1).trim();
      if (key.length === 1) fields[key] = val;
    }
  });

  const parseFloatOrNull = (v: string | undefined): number | null => {
    if (!v) return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  };

  // F: YYYYMMDD -> YYYY-MM-DD
  let data: string | null = null;
  if (fields['F'] && /^\d{8}$/.test(fields['F'])) {
    const f = fields['F'];
    data = f.slice(0, 4) + '-' + f.slice(4, 6) + '-' + f.slice(6, 8);
  }

  return {
    raw,
    nif_emitente: fields['A'] || null,
    nif_comprador: fields['B'] || null,
    pais_comprador: fields['C'] || null,
    tipo_documento: fields['D'] ? fields['D'].toUpperCase() : null,
    estado_documento: fields['E'] || null,
    data,
    numero_documento: fields['G'] || null,
    atcud: fields['H'] || null,
    iva_total: parseFloatOrNull(fields['N']),
    total: parseFloatOrNull(fields['O']),
    hash: fields['Q'] || null,
    cert: fields['R'] || null,
  };
}
