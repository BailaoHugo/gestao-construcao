export type ClassificacaoCapitulo = {
  grande_capitulo: string | null;
  capitulo: string | null;
};

export function classificarCapitulo(descricao: string): ClassificacaoCapitulo {
  const texto = (descricao || "").toLowerCase();

  // Demolições
  if (
    texto.includes("demoli") ||
    texto.includes("remoção") ||
    texto.includes("entulho")
  ) {
    return { grande_capitulo: "E", capitulo: "E2" };
  }

  // Impermeabilizações
  if (texto.includes("impermeabil")) {
    return { grande_capitulo: "E", capitulo: "E5" };
  }

  // Pinturas
  if (texto.includes("pintura") || texto.includes("verniz")) {
    return { grande_capitulo: "E", capitulo: "E11" };
  }

  // Cerâmicos
  if (
    texto.includes("cerâmic") ||
    texto.includes("azulejo") ||
    texto.includes("mosaico")
  ) {
    return { grande_capitulo: "E", capitulo: "E7" };
  }

  // Pavimentos
  if (texto.includes("pavimento")) {
    return { grande_capitulo: "E", capitulo: "E8" };
  }

  // Divisórias / pladur
  if (
    texto.includes("pladur") ||
    texto.includes("gesso cartonado") ||
    texto.includes("divisória")
  ) {
    return { grande_capitulo: "E", capitulo: "E3" };
  }

  // Eletricidade
  if (
    texto.includes("eletric") ||
    texto.includes("tomada") ||
    texto.includes("iluminação")
  ) {
    return { grande_capitulo: "F", capitulo: "F1" };
  }

  // Águas e esgotos
  if (
    texto.includes("água") ||
    texto.includes("esgoto") ||
    texto.includes("canalização")
  ) {
    return { grande_capitulo: "F", capitulo: "F3" };
  }

  // AVAC
  if (
    texto.includes("avac") ||
    texto.includes("ar condicionado") ||
    texto.includes("ventilação")
  ) {
    return { grande_capitulo: "F", capitulo: "F5" };
  }

  // fallback
  return { grande_capitulo: null, capitulo: null };
}