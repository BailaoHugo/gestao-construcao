import capitulosJson from "../../../data/orcamentos/processed/capitulos.json";

type CapRow = {
  code: string;
  description: string;
  grandeCapituloCode: string;
  kFactor: number;
};

const capitulos = capitulosJson as CapRow[];

export type ConfiancaCapitulo = "alta" | "media" | "baixa";

export type ClassificacaoCapituloDetalhe = {
  grande_capitulo: string | null;
  capitulo: string | null;
  score: number;
  confianca: ConfiancaCapitulo;
  motivo: string;
};

/**
 * Normaliza texto para comparação (minúsculas, sem acentos comuns).
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ");
}

function tokenizeForMatch(s: string): string[] {
  const n = normalize(s);
  return n.split(/\s+/).filter((w) => w.length >= 3);
}

function scoreToConfianca(score: number): ConfiancaCapitulo {
  if (score >= 5) return "alta";
  if (score >= 2) return "media";
  return "baixa";
}

/** Palavras-chave fortes por código de capítulo (+2 cada match). */
const KEYWORDS_POR_CAPITULO: Record<string, string[]> = {
  B1: ["levantamento", "topograf", "diagnostico", "inspecao"],
  B2: ["arquitetura", "arq ", "planta", "anteprojeto"],
  B3: ["estrutur", "betao", "armado", "fundac"],
  C2: ["escava", "demolic", "remocao terreno"],
  C1: ["implantac", "cerco", "tapume"],
  D1: ["pilares", "vigas", "laje", "pré-esfor"],
  E1: ["reboco", "emassament", "divisoria"],
  G1: ["telha", "cobertura", "impermeabiliz"],
  I1: ["eletric", "quadro", "cabo"],
  I2: ["canaliz", "agua", "esgoto", "sanita"],
};

function uniqueStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const it of items) {
    const t = it.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/**
 * Classificação completa com score (+1 token descrição cap., +2 keyword forte),
 * confiança e motivo (keywords que casaram ou "sem_match").
 */
export function classificarCapituloPorDescricaoCompleto(
  descricao: string,
): ClassificacaoCapituloDetalhe {
  const trimmed = (descricao ?? "").trim();
  if (!trimmed) {
    return {
      grande_capitulo: null,
      capitulo: null,
      score: 0,
      confianca: "baixa",
      motivo: "sem_match",
    };
  }

  const text = normalize(trimmed);
  let best: {
    cap: CapRow;
    score: number;
    matches: string[];
  } | null = null;

  for (const cap of capitulos) {
    let score = 0;
    const matches: string[] = [];

    const words = tokenizeForMatch(cap.description);
    for (const w of words) {
      if (text.includes(w)) {
        score += 1;
        matches.push(w);
      }
    }

    const codeNorm = normalize(cap.code).replace(/\s/g, "");
    if (codeNorm && text.includes(codeNorm)) {
      score += 1;
      matches.push(`codigo:${cap.code}`);
    }

    const extra = KEYWORDS_POR_CAPITULO[cap.code];
    if (extra) {
      for (const kw of extra) {
        const kn = normalize(kw);
        if (kn.length >= 2 && text.includes(kn)) {
          score += 2;
          matches.push(kw.trim());
        }
      }
    }

    if (score > 0 && (!best || score > best.score)) {
      best = { cap, score, matches: uniqueStrings(matches) };
    }
  }

  if (!best) {
    return {
      grande_capitulo: null,
      capitulo: null,
      score: 0,
      confianca: "baixa",
      motivo: "sem_match",
    };
  }

  const motivo =
    best.matches.length > 0 ? best.matches.join(", ") : "sem_match";

  return {
    grande_capitulo: best.cap.grandeCapituloCode,
    capitulo: best.cap.code,
    score: best.score,
    confianca: scoreToConfianca(best.score),
    motivo,
  };
}

/**
 * Versão compacta (compatível com chamadas existentes): só códigos de capítulo.
 */
export function classificarCapituloPorDescricao(descricao: string): {
  grande_capitulo: string | null;
  capitulo: string | null;
} {
  const c = classificarCapituloPorDescricaoCompleto(descricao);
  return {
    grande_capitulo: c.grande_capitulo,
    capitulo: c.capitulo,
  };
}
