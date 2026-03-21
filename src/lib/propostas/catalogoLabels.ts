import grandesCapitulos from "../../../data/orcamentos/processed/grandes_capitulos.json";
import capitulos from "../../../data/orcamentos/processed/capitulos.json";

type GrandeRow = { code: string; description: string };
type CapRow = { code: string; description: string };

const GRANDE_DESC = new Map<string, string>(
  (grandesCapitulos as GrandeRow[]).map((g) => [g.code.trim(), g.description]),
);

const CAP_DESC = new Map<string, string>(
  (capitulos as CapRow[]).map((c) => [c.code.trim(), c.description]),
);

const SEP = " — ";

/** Ex.: "B" → "B — Projetos e Estudos" */
export function labelGrandeCapitulo(code: string | null | undefined): string {
  const c = (code ?? "").trim();
  if (!c) return "Sem Grande Capítulo";
  const d = GRANDE_DESC.get(c);
  return d ? `${c}${SEP}${d}` : c;
}

/** Ex.: "B1" → "B1 — Levantamentos e Diagnóstico" */
export function labelCapitulo(code: string | null | undefined): string {
  const c = (code ?? "").trim();
  if (!c) return "Sem Capítulo";
  const d = CAP_DESC.get(c);
  return d ? `${c}${SEP}${d}` : c;
}
