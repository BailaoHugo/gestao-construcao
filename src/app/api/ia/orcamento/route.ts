import { NextResponse, type NextRequest } from "next/server";

type Body = {
  descricao?: string;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: "Payload inválido" },
      { status: 400 },
    );
  }

  const descricao = body.descricao?.trim() ?? "";
  if (!descricao) {
    return NextResponse.json(
      { error: "Descrição obrigatória" },
      { status: 400 },
    );
  }

  // Mock simples: devolve sempre as mesmas linhas de teste.
  const linhas: string[] = [
    "E1 — Demolições e Remoções;Remoção de pavimento existente;m2;10,00;12,00;120,00;8,00;80,00",
    "E3 — Rebocos e Acabamentos;Execução de parede em gesso cartonado hidrófugo;m2;8,00;42,00;336,00;28,00;224,00",
    "E5 — Pinturas;Pintura plástica interior em paredes;m2;25,00;14,00;350,00;10,00;250,00",
  ];

  return NextResponse.json({ linhas });
}

