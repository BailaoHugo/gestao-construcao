import type { ReactNode } from "react";

/**
 * Layout mínimo para o segmento /propostas: rotas como /propostas/[id]/print
 * não herdam TopBar nem o cartão principal — evita barra "Propostas" e ruído na impressão/PDF.
 */
export default function PropostasSegmentLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
