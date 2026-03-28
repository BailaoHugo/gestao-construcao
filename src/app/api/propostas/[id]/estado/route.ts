import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/lib/db";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) {
    const { id } = await params;
    const body = (await req.json()) as { estado?: string };
    const { estado } = body;

    const allowed = ["RASCUNHO", "EMITIDA", "APROVADA"];
    if (!estado || !allowed.includes(estado)) {
          return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
        }

    const client = await pool.connect();
    try {
          await client.query(
                  `UPDATE proposta_revisoes
                   SET estado = $2, updated_at = now()
                   WHERE proposta_id = $1
                     AND numero_revisao = (
                                  SELECT MAX(numero_revisao) FROM proposta_revisoes WHERE proposta_id = $1
                                )`,
                  [id, estado],
                );
          return NextResponse.json({ id, estado });
        } finally {
          client.release();
        }
  }
