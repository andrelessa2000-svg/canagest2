import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

async function main() {
  const p = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
  });
  const u = await p.user.findUnique({ where: { email: "demo@canagest.local" } });
  const tratos = await p.trato.deleteMany({
    where: { userId: u!.id, observacao: { contains: "Dono José" } },
  });
  const plantios = await p.plantio.deleteMany({
    where: { userId: u!.id, observacao: { contains: "Dono José" } },
  });
  const colheitas = await p.colheita.deleteMany({
    where: { userId: u!.id, observacao: { contains: "Dono José" } },
  });
  const dono = await p.proprietario.deleteMany({ where: { userId: u!.id } });
  console.log(
    `tratos: ${tratos.count} · plantios: ${plantios.count} · colheitas: ${colheitas.count} · donos: ${dono.count}`,
  );
  await p.$disconnect();
}
main();
