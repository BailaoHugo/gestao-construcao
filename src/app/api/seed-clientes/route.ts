import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const CLIENTES = [
  { nome: "Alexandre Cardoso", nif: "206191340" },
  { nome: "Pedro Alexandre Toscano Paulo Almeida da Silva", nif: "210320818" },
  { nome: "Pedro Monteiro", nif: "221449329" },
  { nome: "Bernardo Laginha Teixeira Mota", nif: "209934301" },
  { nome: "Alcimor Aguiar Rocha Neto", nif: "999999990" },
  { nome: "Manuel Maria Rodrigues de Andrade Costa Gabriel", nif: "222819944" },
  { nome: "Dicasa Actividades Hoteleiras Lda", nif: "506841901" },
  { nome: "YELCO TECHNOLOGIES, S.A.", nif: "513224955" },
  { nome: "GEFIS CONSTRUCAO GESTAO E FISCALIZACAO OBRAS LDA", nif: "502018801" },
  { nome: "Ines Rodrigues", nif: "222150548" },
  { nome: "Saher Abdulkader Baaj", nif: "291212670" },
  { nome: "Osteoparque Lda", nif: "514243635" },
  { nome: "J J Sousa Lda", nif: "500547572" },
  { nome: "Sofia Margarida Apolinário do Vale Lima", nif: "224370499" },
  { nome: "La Table - Actividades Hoteleiras Lda", nif: "500641064" },
  { nome: "Helen Reynolds", nif: "214338762" },
  { nome: "Consumidor Final", nif: "999999990" },
  { nome: "FABX Lda", nif: "514210478" },
  { nome: "Blue Rest, Lda", nif: "517461080" },
  { nome: "Emma Hamilton-Shaw", nif: "295905395" },
  { nome: "Restsof - Actividades de Restauração, lda", nif: "504078356" },
  { nome: "Engebras Lda", nif: "502564385" },
  { nome: "LEONARDO E BRANCO ACTIVIDADES HOTELEIRAS LDA", nif: "501743090" },
  { nome: "Mixe", nif: "508856531" },
  { nome: "COSTA FOLGADO & CAMPOS LDA", nif: "513194169" },
  { nome: "TRIGOSO & BREYNER LDA", nif: "513970606" },
  { nome: "Sergio Daniel Martinez Freites", nif: "311514863" },
  { nome: "TRAQUINAS TUR LDA", nif: "510227546" },
  { nome: "BERDI E CA", nif: "503537047" },
  { nome: "NOOD, LDA", nif: "507496477" },
  { nome: "RETIRO DO BAIÃO - INDUSTRIA HOTELEIRA, LDA", nif: "503023981" },
  { nome: "NATURAL SKY FOOD LDA", nif: "518700380" },
  { nome: "DORIANIMÓVEL - IMOBILIÁRIA, S.A.", nif: "505164574" },
  { nome: "TIDELLI PORTUGAL, LDA", nif: "518826619" },
  { nome: "Condominio Rua Melo e Sousa 621", nif: "900642467" },
  { nome: "Poth Sicala unipessoal lda", nif: "517391180" },
  { nome: "Li Tao", nif: "281844100" },
];

export async function GET() {
  const results: { nome: string; ok: boolean; err?: string }[] = [];
  for (const c of CLIENTES) {
    try {
      await pool.query(
        "INSERT INTO clientes (nome, nif) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [c.nome, c.nif]
      );
      results.push({ nome: c.nome, ok: true });
    } catch (e: unknown) {
      results.push({ nome: c.nome, ok: false, err: String(e) });
    }
  }
  const ok = results.filter((r) => r.ok).length;
  return NextResponse.json({ inserted: ok, total: CLIENTES.length, results });
}
