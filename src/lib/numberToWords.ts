const UNIDADES = [
  "",
  "um",
  "dois",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
  "dez",
  "onze",
  "doze",
  "treze",
  "catorze",
  "quinze",
  "dezasseis",
  "dezassete",
  "dezoito",
  "dezanove",
];

const DEZENAS = [
  "",
  "",
  "vinte",
  "trinta",
  "quarenta",
  "cinquenta",
  "sessenta",
  "setenta",
  "oitenta",
  "noventa",
];

const CENTENAS = [
  "",
  "cento",
  "duzentos",
  "trezentos",
  "quatrocentos",
  "quinhentos",
  "seiscentos",
  "setecentos",
  "oitocentos",
  "novecentos",
];

function tresDigitos(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";

  const centena = Math.floor(n / 100);
  const resto = n % 100;

  if (centena === 0) {
    return dezenas(resto);
  }

  const centStr = CENTENAS[centena];
  if (resto === 0) return centStr;

  // When remainder < 100, use "e" connector
  return `${centStr} e ${dezenas(resto)}`;
}

function dezenas(n: number): string {
  if (n < 20) return UNIDADES[n];
  const d = Math.floor(n / 10);
  const u = n % 10;
  if (u === 0) return DEZENAS[d];
  return `${DEZENAS[d]} e ${UNIDADES[u]}`;
}

function inteiroPorExtenso(n: number): string {
  if (n === 0) return "zero";

  const partes: string[] = [];

  const milhoes = Math.floor(n / 1_000_000);
  const milResto = n % 1_000_000;
  const milhares = Math.floor(milResto / 1_000);
  const resto = milResto % 1_000;

  if (milhoes > 0) {
    if (milhoes === 1) {
      partes.push("um milhão");
    } else {
      partes.push(`${tresDigitos(milhoes)} milhões`);
    }
  }

  if (milhares > 0) {
    if (milhares === 1) {
      partes.push("mil");
    } else {
      partes.push(`${tresDigitos(milhares)} mil`);
    }
  }

  if (resto > 0) {
    partes.push(tresDigitos(resto));
  }

  if (partes.length === 0) return "zero";

  // Join parts: use "e" only when the last part (resto) is < 100
  if (partes.length === 1) return partes[0];

  if (partes.length === 2) {
    // Use "e" between thousands/millions and remainder if remainder < 100
    if (resto > 0 && resto < 100) {
      return `${partes[0]} e ${partes[1]}`;
    }
    return partes.join(" ");
  }

  // 3 parts: milhões + milhares + resto
  const last = partes[partes.length - 1];
  const rest = partes.slice(0, -1).join(" ");
  if (resto > 0 && resto < 100) {
    return `${rest} e ${last}`;
  }
  return partes.join(" ");
}

export function numberToWordsPt(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const euros = Math.floor(rounded);
  const centimos = Math.round((rounded - euros) * 100);

  const eurosPart = `${inteiroPorExtenso(euros)} ${euros === 1 ? "euro" : "euros"}`;

  if (centimos === 0) {
    return eurosPart;
  }

  const centimosPart = `${inteiroPorExtenso(centimos)} ${centimos === 1 ? "cêntimo" : "cêntimos"}`;

  return `${eurosPart} e ${centimosPart}`;
}
