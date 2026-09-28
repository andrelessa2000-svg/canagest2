import { prisma } from "./db";
import { userIdAtual } from "./auth";
import { listaDeSafras, normalizarSafra } from "./safra";

const MODELOS = ["colheita", "plantio", "trato", "investimento"] as const;
type Modelo = (typeof MODELOS)[number];

type Linha = { modelo: Modelo; id: string; safra: string | null };

async function registrosDoUsuario(userId: string): Promise<Linha[]> {
  const [colheitas, plantios, tratos, investimentos] = await Promise.all([
    prisma.colheita.findMany({
      where: { userId, safra: { not: null } },
      select: { id: true, safra: true },
    }),
    prisma.plantio.findMany({
      where: { userId, safra: { not: null } },
      select: { id: true, safra: true },
    }),
    prisma.trato.findMany({
      where: { userId, safra: { not: null } },
      select: { id: true, safra: true },
    }),
    prisma.investimento.findMany({
      where: { userId, safra: { not: null } },
      select: { id: true, safra: true },
    }),
  ]);

  return [
    ...colheitas.map((r) => ({ modelo: "colheita" as const, id: r.id, safra: r.safra })),
    ...plantios.map((r) => ({ modelo: "plantio" as const, id: r.id, safra: r.safra })),
    ...tratos.map((r) => ({ modelo: "trato" as const, id: r.id, safra: r.safra })),
    ...investimentos.map((r) => ({ modelo: "investimento" as const, id: r.id, safra: r.safra })),
  ];
}

export async function safrasDoUsuario(extra?: (string | null | undefined)[]): Promise<string[]> {
  const registros = await registrosDoUsuario(await userIdAtual());
  return listaDeSafras([...registros.map((r) => r.safra), ...(extra ?? [])]);
}

export type ResultadoNormalizacao = {
  atualizados: number;
  ignorados: { safra: string; total: number }[];
  safras: string[];
};

export async function normalizarSafrasDoUsuario(): Promise<ResultadoNormalizacao> {
  const userId = await userIdAtual();
  const registros = await registrosDoUsuario(userId);

  const ignorados = new Map<string, number>();
  const porModelo = new Map<Modelo, { id: string; safra: string }[]>();

  for (const r of registros) {
    if (!r.safra) continue;
    const canonica = normalizarSafra(r.safra);
    if (canonica === r.safra) continue;
    if (!canonica) {
      ignorados.set(r.safra, (ignorados.get(r.safra) ?? 0) + 1);
      continue;
    }
    const lista = porModelo.get(r.modelo) ?? [];
    lista.push({ id: r.id, safra: canonica });
    porModelo.set(r.modelo, lista);
  }

  for (const modelo of MODELOS) {
    const itens = porModelo.get(modelo);
    if (!itens?.length) continue;
    for (const item of itens) {
      if (modelo === "colheita") {
        await prisma.colheita.update({ where: { id: item.id }, data: { safra: item.safra } });
      } else if (modelo === "plantio") {
        await prisma.plantio.update({ where: { id: item.id }, data: { safra: item.safra } });
      } else if (modelo === "trato") {
        await prisma.trato.update({ where: { id: item.id }, data: { safra: item.safra } });
      } else {
        await prisma.investimento.update({ where: { id: item.id }, data: { safra: item.safra } });
      }
    }
  }

  const atualizados = [...porModelo.values()].reduce((t, l) => t + l.length, 0);
  const atual = await registrosDoUsuario(userId);

  return {
    atualizados,
    ignorados: [...ignorados.entries()].map(([safra, total]) => ({ safra, total })),
    safras: listaDeSafras(atual.map((r) => r.safra)),
  };
}
