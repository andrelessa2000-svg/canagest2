export function parseDecimal(input: string): number {
  if (typeof input !== "string") return Number(input);
  const t = input.trim().replace(/\s|\u00a0/g, "");
  if (!t) return NaN;
  if (t.includes(",")) {
    // Vírgula = decimal; pontos = milhares: "2.300,5" -> 2300.5
    return Number(t.replace(/\./g, "").replace(",", "."));
  }
  if (t.includes(".")) {
    // Puntos agrupados de a 3 = milhares: "2.300" -> 2300; senão decimal: "2.5" -> 2.5
    if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
      return Number(t.replace(/\./g, ""));
    }
    return Number(t);
  }
  return Number(t);
}

export const TAREFAS_POR_HA = 3.3;

export const UNIDADES_AREA = ["ha", "tarefas"] as const;
export type UnidadeArea = (typeof UNIDADES_AREA)[number];

export function haParaTarefas(ha: number): number {
  return ha * TAREFAS_POR_HA;
}

export function tarefasParaHa(tarefas: number): number {
  return tarefas / TAREFAS_POR_HA;
}

const nfArea = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

export function fmtHa(ha: number): string {
  return `${nfArea.format(ha)} ha`;
}

export function fmtTarefas(ha: number): string {
  return `${nfArea.format(haParaTarefas(ha))} tarefas`;
}

export function fmtArea(ha: number): string {
  return `${fmtHa(ha)} · ${fmtTarefas(ha)}`;
}

export function fmtTons(t: number): string {
  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
  }).format(t)} t`;
}

const nfTons2 = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function fmtToneladas(t: number): string {
  return `${nfTons2.format(Number.isFinite(t) ? t : 0)} t`;
}

const nfMoney = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function fmtMoney(v: number): string {
  return nfMoney.format(Number.isFinite(v) ? v : 0);
}

const nfAtrT = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

export function fmtAtrT(v: number): string {
  return `${nfAtrT.format(Number.isFinite(v) ? v : 0)} kg ATR/t`;
}

const nfKg = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

export function fmtKgAtr(v: number): string {
  return `${nfKg.format(Number.isFinite(v) ? v : 0)} kg ATR`;
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