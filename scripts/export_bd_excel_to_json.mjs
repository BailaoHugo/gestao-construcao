import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import xlsx from "xlsx";

const RAW_PATH = path.resolve(
  "data/orcamentos/raw/BD_MASTER_Normalizada_4d.xlsx",
);
const OUT_DIR = path.resolve("data/orcamentos/processed");

async function main() {
  const wb = xlsx.readFile(RAW_PATH);

  await mkdir(OUT_DIR, { recursive: true });

  // 00_Enums -> enums.json
  const enumsSheet = wb.Sheets["00_Enums"];
  if (enumsSheet) {
    const rows = xlsx.utils.sheet_to_json(enumsSheet, { defval: "" });
    const enums = rows
      .filter((row) => row.Enum && row.Valor)
      .map((row) => ({
        enumType: String(row.Enum),
        value: String(row.Valor),
        active: String(row.Ativo ?? "1") === "1",
        order: Number(row.Ordem ?? 0),
        notes: row.Observacoes ? String(row.Observacoes) : undefined,
      }));
    await writeFile(
      path.join(OUT_DIR, "enums.json"),
      JSON.stringify(enums, null, 2),
      "utf8",
    );
  }

  // 01_Grandes_Capitulos -> grandes_capitulos.json
  const gcSheet = wb.Sheets["01_Grandes_Capitulos"];
  if (gcSheet) {
    const rows = xlsx.utils.sheet_to_json(gcSheet, { defval: "" });
    const grandesCapitulos = rows
      .filter((row) => row.Código && row.Descrição)
      .map((row) => ({
        code: String(row.Código),
        description: String(row.Descrição),
      }));
    await writeFile(
      path.join(OUT_DIR, "grandes_capitulos.json"),
      JSON.stringify(grandesCapitulos, null, 2),
      "utf8",
    );
  }

  // 02_Capitulos_Completos + 05_K_Capitulos -> capitulos.json
  const capSheet = wb.Sheets["02_Capitulos_Completos"];
  const kSheet = wb.Sheets["05_K_Capitulos"];
  if (capSheet) {
    const capsRows = xlsx.utils.sheet_to_json(capSheet, { defval: "" });
    const kRows = kSheet
      ? xlsx.utils.sheet_to_json(kSheet, { defval: "" })
      : [];
    const kByCode = Object.fromEntries(
      kRows
        .filter((row) => row.Código && row.K !== undefined)
        .map((row) => [String(row.Código), Number(row.K)]),
    );

    const capitulos = capsRows
      .filter((row) => row.Código && row.Descrição && row["Grande Capítulo"])
      .map((row) => ({
        code: String(row.Código),
        description: String(row.Descrição),
        grandeCapituloCode: String(row["Grande Capítulo"]),
        kFactor:
          kByCode[String(row.Código)] !== undefined
            ? kByCode[String(row.Código)]
            : undefined,
      }));

    await writeFile(
      path.join(OUT_DIR, "capitulos.json"),
      JSON.stringify(capitulos, null, 2),
      "utf8",
    );
  }

  // 03_Artigos_MASTER -> artigos_master.json
  const artigosSheet = wb.Sheets["03_Artigos_MASTER"];
  if (artigosSheet) {
    const rows = xlsx.utils.sheet_to_json(artigosSheet, { defval: "" });
    const artigos = rows
      .filter((row) => row.Codigo && row.Descricao)
      .map((row) => ({
        code: String(row.Codigo),
        description: String(row.Descricao),
        unit: String(row.Unidade),
        grandeCapituloCode: String(row.Grande_Capitulo),
        capituloCode: String(row.Capitulo),
        subgrupo: String(row.Subgrupo),
        disciplina: String(row.Disciplina),
        categoriaCusto: String(row.Categoria_Custo),
        tipoMedicao: String(row.Tipo_Medicao),
        incluiMO: String(row.Inclui_MO ?? "0") === "1",
        puCusto:
          row.PU_Custo !== "" && row.PU_Custo !== null
            ? Number(row.PU_Custo)
            : undefined,
        puVendaFixo:
          row.PU_Venda_Fixo !== "" && row.PU_Venda_Fixo !== null
            ? Number(row.PU_Venda_Fixo)
            : undefined,
        observacoes: row.Observacoes ? String(row.Observacoes) : undefined,
        flags: {
          nova: String(row.Flags_Nova ?? "0") === "1",
          reabilitacao: String(row.Flags_Reabilitacao ?? "0") === "1",
          habitacao: String(row.Flags_Habitacao ?? "0") === "1",
          comercio: String(row.Flags_Comercio ?? "0") === "1",
        },
        ativo: String(row.Ativo ?? "1") === "1",
      }));

    await writeFile(
      path.join(OUT_DIR, "artigos_master.json"),
      JSON.stringify(artigos, null, 2),
      "utf8",
    );
  }

  console.log("Export done to", OUT_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

