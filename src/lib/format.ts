export function parseDecimal(input: string): number {
  if (typeof input !== "string") return Number(input);
  const t = input.trim().replace(/\s/g, "");
  if (!t) return NaN;
  if (t.includes(",")) {
    return Number(t.replace(/\./g, "").replace(",", "."));
  }
  if (t.includes(".")) {
    return Number(t.replace(/,/g, ""));
  }
  return Number(t);
}

export function fmtArea(ha: number): string {
  return `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(ha)} ha`;
}

export function fmtTons(t: number): string {
  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
  }).format(t)} t`;
}

export function fmtProd(tHa: number): string {
  return `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(tHa)} t/ha`;
}

export function fmtCount(n: number): string {
  return new Intl.NumberFormat("pt-BR").format(n);
}

const dateLong = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateShort = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
});

export function fmtDate(d: Date): string {
  return dateLong.format(d);
}

export function fmtDateShort(d: Date): string {
  return dateShort.format(d);
}

export function toDateInputValue(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}