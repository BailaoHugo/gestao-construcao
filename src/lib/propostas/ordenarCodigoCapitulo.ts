const NIL = "__NULL__";

/**
 * Compara códigos de capítulo como E1…E13, F1…F10 (número final em ordem
 * numérica, não lexicográfica).
 */
export function compareCodigoCapituloNatural(a: string, b: string): number {
  const ta = a.trim();
  const tb = b.trim();
  if (ta === tb) return 0;

  const rx = /^([A-Za-z]+)(\d+)?$/;
  const ma = ta.match(rx);
  const mb = tb.match(rx);

  if (ma && mb) {
    const [, pa, na] = ma;
    const [, pb, nb] = mb;
    const cmpLetter = pa.localeCompare(pb, "pt");
    if (cmpLetter !== 0) return cmpLetter;
    const numA = na === undefined ? 0 : parseInt(na, 10);
    const numB = nb === undefined ? 0 : parseInt(nb, 10);
    if (Number.isFinite(numA) && Number.isFinite(numB)) {
      return numA - numB;
    }
  }

  return ta.localeCompare(tb, "pt", { numeric: true });
}

/**
 * Chaves de capítulo em UI (`__NULL__` ou código, ex. "E1") ou em agrupamento
 * (`__NULL__` ou `C:E1`).
 */
export function compareChaveCapitulo(a: string, b: string): number {
  if (a === NIL && b === NIL) return 0;
  if (a === NIL) return 1;
  if (b === NIL) return -1;

  const la = a.startsWith("C:") ? a.slice(2) : a;
  const lb = b.startsWith("C:") ? b.slice(2) : b;

  return compareCodigoCapituloNatural(la, lb);
}
