import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

async function main() {
  const p = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
  });
  const u = await p.user.findUnique({ where: { email: "demo@canagest.local" } });
  const tratos = await p.trato.findMany({
    where: { userId: u!.id, observacao: { contains: "Dono José" } },
    select: { fazendaId: true, tarefas: true, valor: true, observacao: true, produtos: true },
  });
  console.log(JSON.stringify(tratos, null, 1));
  await p.$disconnect();
}
main();
