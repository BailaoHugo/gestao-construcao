// ==============================
// GRANDES CAPÍTULOS (A–J)
// ==============================

export const GRANDES_CAPITULOS: Record<string, string> = {
  A: "Licenciamentos e Entidades",
  B: "Projetos e Estudos",
  C: "Movimentos de Terras",
  D: "Estruturas",
  E: "Arquitetura (Obra Interior)",
  F: "Especialidades",
  G: "Coberturas e Fachadas",
  H: "Arranjos Exteriores",
  I: "Fornecimentos e Equipamentos",
  J: "Estaleiro, Gestão e Encargos",
};

// ==============================
// CAPÍTULOS (A1–J5)
// ==============================

export const DESCRICOES_CAPITULOS: Record<string, string> = {
  // A — Licenciamentos e Entidades
  A1: "Taxas e Licenças",
  A2: "Ramais e Ligações",
  A3: "Certificações, Vistorias e Licenças Finais",
  A4: "Gestão Administrativa e Entidades",

  // B — Projetos e Estudos
  B1: "Levantamentos e Diagnóstico",
  B2: "Projeto de Arquitetura",
  B3: "Projeto de Estruturas",
  B4: "Projetos de Especialidades",
  B5: "Medições, MQ e Especificações",
  B6: "Coordenação, Fiscalização e Estudos Complementares",

  // C — Movimentos de Terras
  C1: "Implantação e Preparação de Terreno",
  C2: "Escavações",
  C3: "Aterros, Regularizações e Camadas de Forma",
  C4: "Transporte e Gestão de Terras e Entulhos",
  C5: "Drenagens e Camadas Drenantes",
  C6: "Escavações e Intervenções Especiais",
  C7: "Trabalhos Especiais em Reabilitação",

  // D — Estruturas
  D1: "Demolições e Aberturas em Estruturas",
  D2: "Escoramentos e Contenções Provisórias",
  D3: "Fundações",
  D4: "Estruturas em Betão Armado",
  D5: "Estruturas Metálicas",
  D6: "Estruturas em Madeira",
  D7: "Reforços Estruturais",
  D8: "Reparação e Proteção Estrutural",

  // E — Arquitetura (Obra Interior)
  E1: "Trabalhos Preparatórios e Proteções",
  E2: "Demolições, Remoções e Gestão de Entulhos",
  E3: "Paredes e Forras em Gesso Cartonado",
  E4: "Rebocos, Estuques, Barramentos e Regularizações",
  E5: "Impermeabilizações",
  E6: "Tetos Falsos e Isolamentos em Teto",
  E7: "Revestimentos de Parede",
  E8: "Pavimentos e Rodapés",
  E9: "Carpintarias e Marcenarias Interiores",
  E10: "Vidros, Espelhos, Guardas e Caixilharias Interiores",
  E11: "Pinturas, Vernizes e Tratamentos de Superfície",
  E12: "Remates e Trabalhos Complementares",
  E13: "Caixilharias Exteriores e Vãos Exteriores",

  // F — Especialidades
  F1: "Infraestruturas Elétricas",
  F2: "Aparelhagem, Quadros e Iluminação",
  F3: "ITED e Telecomunicações",
  F4: "Redes de Águas e Esgotos",
  F5: "Equipamentos Sanitários, Cozinhas e AQS",
  F6: "Infraestruturas AVAC e Ventilação",
  F7: "Equipamentos AVAC e Ventilação",
  F8: "Redes de Gás",
  F9: "SCIE, Segurança e Sistemas Especiais",
  F10: "Domótica e Automação",

  // G — Coberturas e Fachadas
  G1: "Coberturas Planas",
  G2: "Coberturas Inclinadas",
  G3: "Revestimentos e Sistemas de Fachada",
  G4: "Reparação e Consolidação de Fachadas",
  G5: "Rufos, Caleiras, Guardas e Remates Exteriores",
  G6: "Trabalhos Auxiliares em Fachadas e Varandas",

  // H — Arranjos Exteriores
  H1: "Preparação e Regularização de Terrenos Exteriores",
  H2: "Pavimentos Exteriores",
  H3: "Muros e Elementos de Contenção",
  H4: "Redes Exteriores",
  H5: "Arranjos Verdes",
  H6: "Vedações, Iluminação e Mobiliário Exterior",
  H7: "Limpezas Finais Exteriores",

  // I — Fornecimentos e Equipamentos
  I1: "Mobiliário Fixo e Bancadas",
  I2: "Louças Sanitárias, Bases e Torneiras",
  I3: "Iluminação Decorativa",
  I4: "Eletrodomésticos e Extração",
  I5: "Equipamentos Técnicos",
  I6: "Sistemas Especiais e Mobilidade Elétrica",
  I7: "Outros Fornecimentos e Elementos Personalizados",

  // J — Estaleiro, Gestão e Encargos
  J1: "Instalação e Infraestruturas de Estaleiro",
  J2: "Gestão, Coordenação e Direção de Obra",
  J3: "Segurança e Saúde em Obra",
  J4: "Limpezas Finais e Desmobilização",
  J5: "Encargos Administrativos, Financeiros e Seguros",
};

// ==============================
// HELPERS
// ==============================

/** Devolve "codigo — descrição" ou só "codigo" se não houver descrição. */
export function labelGrandeCapitulo(codigo: string | null | undefined): string {
  if (codigo == null || codigo === "") return "—";
  const desc = GRANDES_CAPITULOS[codigo.trim()];
  return desc ? `${codigo} — ${desc}` : codigo;
}

/** Devolve "codigo — descrição" ou só "codigo" se não houver descrição. */
export function labelCapitulo(codigo: string | null | undefined): string {
  if (codigo == null || codigo === "") return "—";
  const desc = DESCRICOES_CAPITULOS[codigo.trim()];
  return desc ? `${codigo} — ${desc}` : codigo;
}
