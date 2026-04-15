import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo");
  const centro = searchParams.get("centro_custo_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const conditions: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (tipo) { conditions.push(`d.tipo = $${i++}`); values.push(tipo); }
  if (centro) { conditions.push(`d.centro_custo_id = $${i++}`); values.push(centro); }
  if (from) { conditions.push(`d.data_despesa >= $${i++}`); values.push(from); }
  if (to) { conditions.push(`d.data_despesa <= $${i++}`); values.push(to); }

  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

  const { rows } = await pool.query(
    `SELECT d.*,
      o.nome AS centro_custo_nome,
      o.code AS centro_custo_code,
      COALESCE(
        json_agg(
          json_build_object(
            'id', dl.id,
            'descricao', dl.descricao,
            'referencia', dl.referencia,
            'quantidade', dl.quantidade,
            'unidade', dl.unidade,
            'preco_unit_sem_iva', dl.preco_unit_sem_iva,
            'taxa_iva', dl.taxa_iva,
            'desconto_pct', dl.desconto_pct,
            'total_sem_iva', dl.total_sem_iva
          ) ORDER BY dl.criado_em
        ) FILTER (WHERE dl.id IS NOT NULL),
        '[]'
      ) AS linhas
    FROM despesas d
    LEFT JOIN obras o ON o.id = d.centro_custo_id
    LEFT JOIN despesa_linhas dl ON dl.despesa_id = d.id
    ${where}
    GROUP BY d.id, o.nome, o.code
    ORDER BY d.data_despesa DESC, d.created_at DESC
    LIMIT 500`,
    values
  );
  return NextResponse.json({ rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    data_despesa, descricao, tipo, valor, centro_custo_id,
    fornecedor, notas, documento_ref,
    numero_fatura, valor_sem_iva, valor_iva, valor_total_civa,
    linhas,
  } = body;

  if (!descricao || !tipo || !valor) {
    return NextResponse.json({ error: "descricao, tipo e valor sao obrigatorios" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `INSERT INTO despesas
        (data_despesa, descricao, tipo, valor, centro_custo_id, fornecedor, notas, documento_ref,
         numero_fatura, valor_sem_iva, valor_iva, valor_total_civa)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        data_despesa ?? new Date().toISOString().slice(0, 10),
        descricao, tipo, valor,
        centro_custo_id || null, fornecedor || null, notas || null, documento_ref || null,
        numero_fatura || null,
        valor_sem_iva != null ? valor_sem_iva : null,
        valor_iva != null ? valor_iva : null,
        valor_total_civa != null ? valor_total_civa : null,
      ]
    );
    const despesa = rows[0];

    if (Array.isArray(linhas) && linhas.length > 0) {
      for (const l of linhas) {
        await client.query(
          `INSERT INTO despesa_linhas
            (despesa_id, descricao, referencia, quantidade, unidade,
             preco_unit_sem_iva, taxa_iva, desconto_pct, total_sem_iva)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            despesa.id,
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

    await client.query("COMMIT");
    return NextResponse.json({ row: { ...despesa, linhas: linhas ?? [] } }, { status: 201 });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
