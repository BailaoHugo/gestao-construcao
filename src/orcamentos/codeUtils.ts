export function generateNextCodeForCap(
  capituloCode: string,
  usedCodes: Set<string>,
): string {
  let max = 0;
  for (const code of usedCodes) {
    if (!code.startsWith(`${capituloCode}.`)) continue;
    const suffix = code.slice(capituloCode.length + 1);
    const num = parseInt(suffix.replace(/\D/g, ""), 10);
    if (!Number.isNaN(num) && num > max) max = num;
  }
  const next = max + 1;
  return `${capituloCode}.${String(next).padStart(4, "0")}`;
}

