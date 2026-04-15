import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await pool.query("DELETE FROM despesas WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const {
    data_despesa, descricao, tipo, valor, centro_custo_id,
    fornecedor, notas, documento_ref,
    numero_fatura, valor_sem_iva, valor_iva, valor_total_civa,
    linhas,
  } = body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `UPDATE despesas SET
        data_despesa = $1, descricao = $2, tipo = $3, valor = $4,
        centro_custo_id = $5, fornecedor = $6, notas = $7, documento_ref = $8,
        numero_fatura = $9, valor_sem_iva = $10, valor_iva = $11, valor_total_civa = $12,
        updated_at = now()
       WHERE id = $13 RETURNING *`,
      [
        data_despesa, descricao, tipo, valor,
        centro_custo_id || null, fornecedor || null, notas || null, documento_ref || null,
        numero_fatura || null,
        valor_sem_iva != null ? valor_sem_iva : null,
        valor_iva != null ? valor_iva : null,
        valor_total_civa != null ? valor_total_civa : null,
        id,
      ]
    );

    if (linhas !== undefined) {
      await client.query("DELETE FROM despesa_linhas WHERE despesa_id = $1", [id]);
      if (Array.isArray(linhas) && linhas.length > 0) {
        for (const l of linhas) {
          await client.query(
            `INSERT INTO despesa_linhas
              (despesa_id, descricao, referencia, quantidade, unidade,
               preco_unit_sem_iva, taxa_iva, desconto_pct, total_sem_iva)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [
              id,
              l.descricao, l.referencia || null,
              l.quantidade ?? 1, l.unidade || "un",
              l.preco_unit_sem_iva ?? 0,
              l.taxa_iva ?? 23,
              l.desconto_pct ?? 0,
              l.total_sem_iva,
            ]
          );
        }
      }
    }

    await client.query("COMMIT");
    return NextResponse.json({ row: rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
