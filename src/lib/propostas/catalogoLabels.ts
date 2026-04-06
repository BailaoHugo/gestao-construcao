/**
 * catalogoLabels.ts
 * Funções de label para capítulos do catálogo.
 * Usa capitulo_nome directamente (catalogo_ennova) — sem dependência de JSONs externos.
 */

const SEP = " — ";

/**
 * Devolve label para grande capítulo.
 * Com catalogo_ennova o grande capítulo é o próprio capitulo_nome.
 */
export function labelGrandeCapitulo(code: string | null | undefined): string {
  const c = (code ?? "").trim();
  if (!c) return "Sem Grande Capítulo";
  return c;
}

/**
 * Devolve label para capítulo.
 * Com catalogo_ennova o capítulo é o próprio capitulo_nome.
 */
export function labelCapitulo(code: string | null | undefined): string {
  const c = (code ?? "").trim();
  if (!c) return "Sem Capítulo";
  return c;
}
