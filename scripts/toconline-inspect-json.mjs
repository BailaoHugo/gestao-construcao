#!/usr/bin/env node
/**
 * Lê JSON gravado por toconline-verify (ou caminho passado) e imprime só estrutura:
 * chaves, tipos, tamanhos de arrays — valores escalares substituídos por <redacted>.
 *
 * Uso na VM após npm run toconline:verify:
 *   npm run toconline:inspect-json
 *   npm run toconline:inspect-json -- tmp/toconline-verify/01-list-v1.json
 *   npm run toconline:inspect-json -- --all
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DEFAULT_DIR = join(__dirname, "..", "tmp", "toconline-verify");

function redact(value, depth = 0, maxDepth = 12) {
  if (depth > maxDepth) return "<max-depth>";
  if (value === null) return null;
  const t = typeof value;
  if (t === "string") return "<string>";
  if (t === "number") return "<number>";
  if (t === "boolean") return "<boolean>";
  if (Array.isArray(value)) {
    if (value.length === 0) return [];
    const first = redact(value[0], depth + 1, maxDepth);
    return { _arrayLength: value.length, _itemShape: first };
  }
  if (t === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = redact(v, depth + 1, maxDepth);
    }
    return out;
  }
  return "<unknown>";
}

function extractJsonApiHints(obj) {
  const hints = [];
  const data = obj?.data;
  if (data === undefined) return hints;
  const items = Array.isArray(data) ? data.slice(0, 1) : data ? [data] : [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    hints.push({
      resourceType: item.type ?? null,
      id: item.id != null ? "<id>" : null,
      attributeKeys: item.attributes && typeof item.attributes === "object"
        ? Object.keys(item.attributes).sort()
        : [],
      relationshipKeys: item.relationships && typeof item.relationships === "object"
        ? Object.keys(item.relationships).sort()
        : [],
    });
  }
  return hints;
}

function main() {
  const args = process.argv.slice(2);
  const all = args.includes("--all");
  const paths = args.filter((a) => !a.startsWith("-"));

  let files = [];
  if (all) {
    if (!existsSync(DEFAULT_DIR)) {
      console.error(`Pasta não existe: ${DEFAULT_DIR}\nCorre primeiro: npm run toconline:verify`);
      process.exit(1);
    }
    files = readdirSync(DEFAULT_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => join(DEFAULT_DIR, f))
      .sort();
    if (!files.length) {
      console.error(`Nenhum .json em ${DEFAULT_DIR}`);
      process.exit(1);
    }
  } else if (paths.length) {
    files = paths.map((p) => resolve(process.cwd(), p));
  } else {
    const fallback = join(DEFAULT_DIR, "01-list-v1.json");
    if (!existsSync(fallback)) {
      console.error(
        `Ficheiro por defeito não encontrado: ${fallback}\n` +
          "Uso: npm run toconline:inspect-json -- caminho/para/ficheiro.json\n" +
          "     npm run toconline:inspect-json -- --all",
      );
      process.exit(1);
    }
    files = [fallback];
  }

  for (const file of files) {
    if (!existsSync(file)) {
      console.error(`Não encontrado: ${file}`);
      continue;
    }
    let raw;
    try {
      raw = JSON.parse(readFileSync(file, "utf8"));
    } catch (e) {
      console.error(`JSON inválido: ${file}`, e);
      continue;
    }

    console.log("\n===", file, "===\n");
    const hints = extractJsonApiHints(raw);
    if (hints.length) {
      console.log("JSON:API (primeiro recurso em data):");
      console.log(JSON.stringify(hints, null, 2));
      console.log("");
    }
    console.log("Estrutura completa (valores redigidos):");
    console.log(JSON.stringify(redact(raw), null, 2));
  }
}

main();
