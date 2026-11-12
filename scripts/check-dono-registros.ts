import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

async function main() {
  const p = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
  });
  const u = await p.user.findUnique({ where: { email: "demo@canagest.local" } });
  const ids = await p.fazenda.findMany({
    where: { userId: u!.id, proprietario: { nome: "José" } },
    select: { id: true, nome: true },
  });
  console.log("fazendas do José:", ids);
  const plantios = await p.plantio.findMany({
    where: { userId: u!.id, fazendaId: { in: ids.map((f) => f.id) }, observacao: { contains: "Dono José" } },
    select: { tarefas: true, valor: true, areaHa: true, insumos: true },
  });
  console.log("plantios:", JSON.stringify(plantios, null, 1));
  const colheitas = await p.colheita.findMany({
    where: { userId: u!.id, fazendaId: { in: ids.map((f) => f.id) }, observacao: { contains: "Dono José" } },
    select: { toneladas: true, areaColhida: true, precoCana: true, escopo: true, custo: { select: { ctc: true } } },
  });
  console.log("colheitas:", JSON.stringify(colheitas, null, 1));
  const totalColheitas = await p.colheita.count({ where: { userId: u!.id } });
  console.log("total colheitas do usuário:", totalColheitas);
  await p.$disconnect();
}
main();
