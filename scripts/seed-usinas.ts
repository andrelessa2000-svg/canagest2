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
  const primeiro = await prisma.user.findFirst({ orderBy: { criadoEm: "asc" } });
  if (!primeiro) {
    throw new Error("Nenhun usuario para associar as usinas. Registre-se antes.");
  }
  for (const def of usinas) {
    const u = await prisma.usina.upsert({
      where: { userId_nome: { userId: primeiro.id, nome: def.nome } },
      update: { modelo: def.modelo },
      create: { ...def, userId: primeiro.id },
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
