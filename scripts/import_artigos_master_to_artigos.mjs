import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    "[import-artigos] DATABASE_URL não está definido. Configure a ligação ao Supabase primeiro.",
  );
  process.exit(1);
}

const useSsl =
  !!process.env.VERCEL ||
  (typeof connectionString === "string" &&
    connectionString.includes("supabase.co"));

const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

async function loadJson() {
  const filePath = path.resolve(
    __dirname,
    "../data/orcamentos/processed/artigos_master.json",
  );
  const raw = await readFile(filePath, "utf-8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data)) {
    throw new Error("Conteúdo de artigos_master.json não é um array.");
  }

  return data;
}

async function main() {
  const artigos = await loadJson();
  console.log(`[import-artigos] ${artigos.length} artigos a importar.`);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const upsertSql = `
      insert into artigos (
        codigo,
        descricao,
        unidade,
        grande_capitulo,
        capitulo,
        subgrupo,
        disciplina,
        categoria_custo,
        tipo_medicao,
        inclui_mo,
        pu_custo,
        pu_venda,
        ativo,
        origem
      )
      values (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, 'MASTER'
      )
      on conflict (codigo) do update set
        descricao        = excluded.descricao,
        unidade          = excluded.unidade,
        grande_capitulo  = excluded.grande_capitulo,
        capitulo         = excluded.capitulo,
        subgrupo         = excluded.subgrupo,
        disciplina       = excluded.disciplina,
        categoria_custo  = excluded.categoria_custo,
        tipo_medicao     = excluded.tipo_medicao,
        inclui_mo        = excluded.inclui_mo,
        pu_custo         = excluded.pu_custo,
        pu_venda         = excluded.pu_venda,
        ativo            = excluded.ativo,
        origem           = excluded.origem,
        updated_at       = now();
    `;

    const batchSize = 500;
    let processed = 0;

    for (let i = 0; i < artigos.length; i += batchSize) {
      const batch = artigos.slice(i, i + batchSize);

      for (const item of batch) {
        const codigo = item.code;
        const descricao = item.description;
        const unidade = item.unit ?? null;
        const grandeCapitulo = item.grandeCapituloCode ?? null;
        const capitulo = item.capituloCode ?? null;
        const subgrupo = item.subgrupo ?? null;
        const disciplina = item.disciplina ?? null;
        const categoriaCusto = item.categoriaCusto ?? null;
        const tipoMedicao = item.tipoMedicao ?? null;
        const incluiMo = !!item.incluiMO;
        const puCusto =
          item.puCusto !== undefined && item.puCusto !== null
            ? Number(item.puCusto)
            : null;
        const puVenda =
          item.puVendaFixo !== undefined && item.puVendaFixo !== null
            ? Number(item.puVendaFixo)
            : null;
        const ativo =
          item.ativo === undefined || item.ativo === null
            ? true
            : Boolean(item.ativo);

        if (!codigo || !descricao) {
          console.warn(
            "[import-artigos] A ignorar artigo sem código ou descrição:",
            item,
          );
          continue;
        }

        const params = [
          codigo,
          descricao,
          unidade,
          grandeCapitulo,
          capitulo,
          subgrupo,
          disciplina,
          categoriaCusto,
          tipoMedicao,
          incluiMo,
          puCusto,
          puVenda,
          ativo,
        ];

        await client.query(upsertSql, params);
        processed += 1;
      }

      console.log(
        `[import-artigos] Processados ${Math.min(
          processed,
          artigos.length,
        )}/${artigos.length}`,
      );
    }

    await client.query("COMMIT");
    console.log("[import-artigos] Importação concluída com sucesso.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[import-artigos] Erro durante importação:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[import-artigos] Erro fatal:", err);
  process.exit(1);
});

