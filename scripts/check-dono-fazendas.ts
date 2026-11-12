import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

async function main() {
  const p = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
  });
  const u = await p.user.findUnique({ where: { email: "demo@canagest.local" } });
  const fazendas = await p.fazenda.findMany({
    where: { userId: u!.id },
    select: { id: true, nome: true, proprietarioId: true },
    orderBy: { nome: "asc" },
  });
  const donos = await p.proprietario.findMany({ where: { userId: u!.id } });
  console.log("donos:", donos.map((d) => d.nome));
  console.log(fazendas.map((f) => `${f.nome} -> ${f.proprietarioId ?? "-"}`));
  await p.$disconnect();
}
main();
