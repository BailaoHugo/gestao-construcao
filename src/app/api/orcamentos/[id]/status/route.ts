import { NextResponse, type NextRequest } from "next/server";
import type { BudgetStatus } from "@/orcamentos/domain";
import { pool } from "@/lib/db";

const VALID_STATUSES: BudgetStatus[] = ["EM_EXECUCAO", "EM_ANALISE", "APROVADO"];

function parseStatus(value: unknown): BudgetStatus | null {
  if (typeof value === "string" && VALID_STATUSES.includes(value as BudgetStatus)) {
    return value as BudgetStatus;
  }
  return null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: { status?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const status = parseStatus(body.status);
  if (status === null) {
    return NextResponse.json(
      { error: "status must be one of: EM_EXECUCAO, EM_ANALISE, APROVADO" },
      { status: 400 },
    );
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `update budgets set status = $1, updated_at = now() where id = $2 returning id, status`,
      [status, id],
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 });
    }
    const row = result.rows[0] as { id: string; status: string };
    return NextResponse.json({ id: row.id, status: row.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/orcamentos/[id]/status] PATCH failed:", message);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
