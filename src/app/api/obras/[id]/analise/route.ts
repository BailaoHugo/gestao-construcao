import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Orcamento: capitulos e totais da revisao ativa
    // Usa obra_nome (snake_case, coluna real na BD) para join com obras.name
    let orcamento: { capitulo: string; orcado: string }[] = [];
    try {
      const { rows } = await pool.query(`
        SELECT prl.capitulo, SUM(prl.quantidade * prl.preco_venda_unitario) AS orcado
        FROM obras o
        JOIN propostas p ON p.obra_nome = o.name
        JOIN proposta_revisoes pr ON pr.proposta_id = p.id
          AND pr.id = (
            SELECT pr2.id FROM proposta_revisoes pr2
            WHERE pr2.proposta_id = p.id
            ORDER BY CASE WHEN pr2.estado != 'RASCUNHO' THEN 0 ELSE 1 END,
              pr2.numero_revisao DESC
            LIMIT 1
          )
        JOIN proposta_linhas prl ON prl.revisao_id = pr.id
        WHERE o.id = $1
        GROUP BY prl.capitulo
        ORDER BY prl.capitulo
      `, [id]);
      orcamento = rows;
    } catch (e) {
      console.error("orcamento query error:", e);
    }

    // Custos: despesas agrupadas por tipo
    const { rows: despesasCustos } = await pool.query(`
      SELECT tipo AS categoria, SUM(valor) AS gasto
      FROM despesas
      WHERE centro_custo_id = $1
      GROUP BY tipo
      ORDER BY tipo
    `, [id]);

    // Custos: mao de obra do ponto
    let pontoCustos: { categoria: string; gasto: string }[] = [];
    try {
      const { rows } = await pool.query(`
        SELECT 'mao_obra' AS categoria,
          SUM(COALESCE(rp.custo, rp.horas * t.custo_hora)) AS gasto
        FROM registos_ponto rp
        JOIN trabalhadores t ON t.id = rp.trabalhador_id
        WHERE rp.obra_id = $1 AND rp.tipo != 'falta'
      `, [id]);
      if (rows[0]?.gasto && parseFloat(rows[0].gasto) > 0) {
        pontoCustos = rows;
      }
    } catch {
      // tabela registos_ponto pode nao existir
    }

    const custos = [...despesasCustos, ...pontoCustos];

    const totalOrcado = orcamento.reduce((s, r) => s + parseFloat(r.orcado || "0"), 0);
    const totalGasto = custos.reduce((s: number, r: { gasto: string }) => s + parseFloat(r.gasto || "0"), 0);

    // Faturado: faturas de venda emitidas para esta obra
    let totalFaturado = 0;
    try {
      const { rows: fRows } = await pool.query(`
        SELECT COALESCE(SUM(total), 0) AS faturado
        FROM faturas_venda
        WHERE obra_id = $1
      `, [id]);
      totalFaturado = parseFloat(fRows[0]?.faturado ?? "0");
    } catch {
      // tabela pode nao existir ainda
    }

    // Ultimo avanco
    const { rows: avancos } = await pool.query(`
      SELECT * FROM obra_avancos
      WHERE obra_id = $1
      ORDER BY numero DESC
      LIMIT 1
    `, [id]);
    const ultimoAvanco = avancos[0] || null;

    return NextResponse.json({
      orcamento,
      custos,
      totalOrcado,
      totalGasto,
      totalFaturado,
      saldo: totalOrcado - totalGasto,
      margemBruta: totalFaturado > 0 ? ((totalFaturado - totalGasto) / totalFaturado) * 100 : 0,
      percentagemGasto: totalOrcado > 0 ? (totalGasto / totalOrcado) * 100 : 0,
      ultimoAvanco,
    });
  } catch (err) {
    console.error("analise error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
