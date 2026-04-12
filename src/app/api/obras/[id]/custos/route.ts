import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Despesas ligadas a esta obra (campo centro_custo_id = obra.id)
    const { rows: despesas } = await pool.query(`
      SELECT
        d.id,
        d.data_despesa::text AS data,
        d.descricao,
        d.tipo AS categoria,
        d.valor::text AS valor,
        d.fornecedor,
        d.documento_ref
      FROM despesas d
      WHERE d.centro_custo_id = $1
      ORDER BY d.data_despesa DESC
    `, [id]);

    // Registos de ponto ligados a esta obra (campo obra_id)
    let ponto: { id: string; data: string; descricao: string; horas: string; valor: string; trabalhador: string }[] = [];
    try {
      const { rows } = await pool.query(`
        SELECT
          rp.id,
          rp.data::text AS data,
          t.nome AS descricao,
          rp.horas::text AS horas,
          COALESCE(rp.custo, rp.horas * t.custo_hora)::text AS valor,
          t.nome AS trabalhador
        FROM registos_ponto rp
        JOIN trabalhadores t ON t.id = rp.trabalhador_id
        WHERE rp.obra_id = $1 AND rp.tipo != 'falta'
        ORDER BY rp.data DESC
      `, [id]);
      ponto = rows;
    } catch {
      // registos_ponto pode nao existir ainda
    }

    const totalDespesas = despesas.reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
    const totalMaoObra  = ponto.reduce((s, r) => s + parseFloat(r.valor || "0"), 0);

    return NextResponse.json({
      despesas,
      ponto,
      totalDespesas,
      totalMaoObra,
      total: totalDespesas + totalMaoObra,
    });
  } catch (err) {
    console.error("custos error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
