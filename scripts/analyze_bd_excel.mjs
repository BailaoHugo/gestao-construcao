import { readFile } from "node:fs/promises";
import path from "node:path";
import xlsx from "xlsx";

async function main() {
  const filePath = path.resolve(
    "data/orcamentos/raw/BD_MASTER_Normalizada_4d.xlsx",
  );

  try {
    await readFile(filePath);
  } catch {
    console.error("File not found:", filePath);
    process.exit(1);
  }

  const workbook = xlsx.readFile(filePath);
  console.log("Sheets:", workbook.SheetNames);

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const range = xlsx.utils.decode_range(sheet["!ref"]);
    const maxRows = Math.min(range.e.r, 15);
    const previewRange = {
      s: { r: 0, c: 0 },
      e: { r: maxRows, c: range.e.c },
    };

    const preview = xlsx.utils.sheet_to_json(sheet, {
      header: 1,
      range: previewRange,
      defval: "",
    });

    console.log(`\n=== Sheet: ${sheetName} ===`);
    for (const row of preview) {
      console.log(row.join(" | "));
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

