/**
 * Mapas de códigos → descrições textuais para Grandes Capítulos (A–J) e Capítulos.
 * Usado na página /catalogo para mostrar código + descrição. Sem alteração de schema.
 */

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

export const CAPITULOS: Record<string, string> = {
  // A
  A1: "Licenças e Taxas Municipais",
  A2: "Ramais e Ligações (Água, Eletricidade, etc.)",
  A3: "Entidades e Fiscalização",
  A4: "Outros Licenciamentos",
  // B
  B1: "Projetos de Arquitetura",
  B2: "Projetos de Especialidades",
  B3: "Estudos e Ensaios",
  B4: "Fiscalização e Direção de Obra",
  B5: "Coordenação e Gestão de Projeto",
  B6: "Outros Projetos e Estudos",
  // C
  C1: "Demolições e Desaterros",
  C2: "Movimentos de Terras",
  C3: "Drenagens e Escavações",
  C4: "Fundações Diretas",
  C5: "Saneamento e Redes",
  C6: "Pavimentação e Acessos",
  C7: "Outros Movimentos de Terras",
  // D
  D1: "Estrutura em Betão",
  D2: "Estrutura Metálica",
  D3: "Pré‑esforço e Pré‑fabricados",
  D4: "Alvenarias Estruturais",
  D5: "Madeira e Derivados",
  D6: "Fundações Especiais",
  D7: "Contenções",
  D8: "Outros Elementos Estruturais",
  // E
  E1: "Demolições e Remoções",
  E2: "Alvenarias e Paredes",
  E3: "Rebocos e Acabamentos",
  E4: "Pavimentos",
  E5: "Pinturas",
  E6: "Caixilharias",
  E7: "Coberturas e Tectos",
  E8: "Revestimentos Cerâmicos e Barramentos",
  E9: "Divisórias e Tetos Falsos",
  E10: "Instalações Sanitárias e Águas",
  E11: "Escadas e Guardas",
  E12: "Carpintarias e Portas Interiores",
  E13: "Outros (Arquitetura Interior)",
  // F
  F1: "Instalações Elétricas",
  F2: "AVAC e Ventilação",
  F3: "Gás e Combustíveis",
  F4: "Saneamento e Águas",
  F5: "Segurança contra Incêndios",
  F6: "Comunicações e IT",
  F7: "Elevadores e Monta‑cargas",
  F8: "Proteção contra Descargas",
  F9: "Automação e Domótica",
  F10: "Outras Especialidades",
  // G
  G1: "Coberturas (Telhados)",
  G2: "Fachadas e Isolamento",
  G3: "Canalizações e Águas Pluviais",
  G4: "Janelas e Caixilharia Exterior",
  G5: "Impermeabilizações",
  G6: "Outros (Coberturas e Fachadas)",
  // H
  H1: "Pavimentação Exterior",
  H2: "Drenagens e Rede Pluvial",
  H3: "Muros e Cercas",
  H4: "Paisagismo e Plantação",
  H5: "Acessos e Vias",
  H6: "Iluminação Exterior",
  H7: "Outros Arranjos Exteriores",
  // I
  I1: "Equipamentos de Cozinha",
  I2: "Equipamentos Sanitários",
  I3: "Aquecimento e AC",
  I4: "Mobiliário Incorporado",
  I5: "Fornecimentos Especiais",
  I6: "Sinalética e Segurança",
  I7: "Outros Fornecimentos",
  // J
  J1: "Instalação de Estaleiro",
  J2: "Segurança e Saúde",
  J3: "Gestão e Coordenação",
  J4: "Encargos Gerais",
  J5: "Contingências e Imprevistos",
};

/** Devolve "codigo — descrição" ou só "codigo" se não houver descrição. */
export function labelGrandeCapitulo(codigo: string | null | undefined): string {
  if (codigo == null || codigo === "") return "—";
  const desc = GRANDES_CAPITULOS[codigo.trim()];
  return desc ? `${codigo} — ${desc}` : codigo;
}

/** Devolve "codigo — descrição" ou só "codigo" se não houver descrição. */
export function labelCapitulo(codigo: string | null | undefined): string {
  if (codigo == null || codigo === "") return "—";
  const desc = CAPITULOS[codigo.trim()];
  return desc ? `${codigo} — ${desc}` : codigo;
}
