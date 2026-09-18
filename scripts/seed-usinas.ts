import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL não definida no ambiente.");
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

const usinas = [
  { nome: "Usina Pindorama", modelo: "pindorama" },
  { nome: "Usina Coruripe", modelo: "coruripe" },
];

async function main() {
  for (const def of usinas) {
    const u = await prisma.usina.upsert({
      where: { nome: def.nome },
      update: { modelo: def.modelo },
      create: def,
    });
    console.log(`Usina ok: ${u.nome} (${u.modelo})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
