import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { withTransaction } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = body.items;
    const meta = body.meta ?? {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "items must be a non-empty array" },
        { status: 400 },
      );
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    const codigoInterno: string =
      typeof meta?.codigoInternoObra === "string"
        ? meta.codigoInternoObra
        : "";
    const codigoInternoObra = codigoInterno || null;

    await withTransaction(async (client) => {
      await client.query(
        `
          insert into budgets (id, created_at, updated_at, codigo_interno_obra, meta)
          values ($1, $2, $3, $4, $5)
        `,
        [id, now, now, codigoInternoObra, meta],
      );

      for (const item of items) {
        const itemId = randomUUID();
        await client.query(
          `
            insert into budget_items (
              id,
              budget_id,
              code,
              description,
              unit,
              quantity,
              unit_price,
              custo_unitario,
              preco_venda_unitario,
              k_aplicado,
              row_id
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `,
          [
            itemId,
            id,
            item.code,
            item.description,
            item.unit,
            item.quantity,
            item.unitPrice,
            item.custoUnitario ?? null,
            item.precoVendaUnitario ?? null,
            item.kAplicado ?? null,
            item.rowId,
          ],
        );
      }
    });

    return NextResponse.json({ id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[api/orcamentos] Failed to save orçamento:", message, stack);
    return NextResponse.json(
      { error: "Failed to save orçamento" },
      { status: 500 },
    );
  }
}

