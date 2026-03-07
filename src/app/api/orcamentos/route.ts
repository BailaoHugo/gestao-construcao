import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { NextResponse, type NextRequest } from "next/server";
import type { BudgetStatus } from "@/orcamentos/domain";
import { withTransaction } from "@/lib/db";

const VALID_STATUSES: BudgetStatus[] = ["EM_EXECUCAO", "EM_ANALISE", "APROVADO"];

function parseStatus(value: unknown): BudgetStatus {
  if (typeof value === "string" && VALID_STATUSES.includes(value as BudgetStatus)) {
    return value as BudgetStatus;
  }
  return "EM_EXECUCAO";
}

function getDbHostname(): string | null {
  const u = process.env.DATABASE_URL;
  if (!u || typeof u !== "string") return null;
  try {
    const url = new URL(u.replace(/^postgresql:\/\//i, "https://"));
    return url.hostname || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const dbHost = getDbHostname();
  if (!dbHost) {
    console.error("[api/orcamentos] DATABASE_URL missing or invalid (no hostname)");
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 },
    );
  }
  try {
    await lookup(dbHost);
  } catch (dnsErr) {
    const msg = dnsErr instanceof Error ? dnsErr.message : String(dnsErr);
    console.error("[api/orcamentos] DNS lookup failed for DB host:", dbHost, msg);
    return NextResponse.json(
      { error: "Database unreachable (DNS)" },
      { status: 503 },
    );
  }

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
    const status = parseStatus(body.status);

    await withTransaction(async (client) => {
      await client.query(
        `
          insert into budgets (id, created_at, updated_at, codigo_interno_obra, meta, status)
          values ($1, $2, $3, $4, $5, $6)
        `,
        [id, now, now, codigoInternoObra, meta, status],
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

