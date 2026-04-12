import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Orcamento: capitulos e totais da proposta vinculada a obra
  const { rows: orcamento } = await pool.query(`
    SELECT
      prl.capitulo,
      SUM(prl.quantidade * prl.preco_unitario) AS orcado
    FROM obras o
    JOIN contratos c ON c.obra_id = o.id
    JOIN propostas p ON p.id = c.proposta_id
    JOIN proposta_revisoes pr ON pr.proposta_id = p.id AND pr.is_active = true
    JOIN proposta_revisao_linhas prl ON prl.revisao_id = pr.id
    WHERE o.id = $1
    GROUP BY prl.capitulo
    ORDER BY prl.capitulo
  `, [id]);

  // Custos reais agrupados por categoria
  const { rows: custos } = await pool.query(`
    SELECT
      categoria,
      SUM(valor) AS gasto
    FROM obra_custos
    WHERE obra_id = $1
    GROUP BY categoria
    ORDER BY categoria
  `, [id]);

  const totalOrcado = orcamento.reduce((s: number, r: { orcado: string }) => s + parseFloat(r.orcado || "0"), 0);
  const totalGasto = custos.reduce((s: number, r: { gasto: string }) => s + parseFloat(r.gasto || "0"), 0);

  // Ultimo avanco
  const { rows: avancos } = await pool.query(`
    SELECT * FROM obra_avancos WHERE obra_id = $1 ORDER BY numero DESC LIMIT 1
  `, [id]);
  const ultimoAvanco = avancos[0] || null;

  return NextResponse.json({
    orcamento,
    custos,
    totalOrcado,
    totalGasto,
    saldo: totalOrcado - totalGasto,
    percentagemGasto: totalOrcado > 0 ? (totalGasto / totalOrcado) * 100 : 0,
    ultimoAvanco,
  });
}
