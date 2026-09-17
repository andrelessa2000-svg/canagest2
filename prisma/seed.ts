import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL não definida no ambiente.");
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

const variedades = ["CTC 9001", "CTC 9002", "RB 867515", "SP 80-1842", "RB 966928"];
const tipos = ["planta", "soca", "ressoca"];

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  const fazendas = [
    { nome: "Fazenda Boa Vista", cidade: "Morro Agudo", uf: "SP", areaTotalHa: 640 },
    { nome: "Fazenda Santa Clara", cidade: "Incrubatão", uf: "MG", areaTotalHa: 385 },
    { nome: "Fazenda São José", cidade: "Barrinha", uf: "SP", areaTotalHa: 512 },
  ];

  for (const def of fazendas) {
    const fazenda = await prisma.fazenda.create({
      data: {
        nome: def.nome,
        cidade: def.cidade,
        uf: def.uf,
        areaTotalHa: def.areaTotalHa,
      },
    });

    const qtdTalhoes = randInt(4, 7);
    for (let t = 1; t <= qtdTalhoes; t++) {
      const areaHa = randInt(18, 70) + Math.round(Math.random() * 10) / 10;
      const talhao = await prisma.talhao.create({
        data: {
          fazendaId: fazenda.id,
          nome: `T-${String(t).padStart(2, "0")}`,
          variedade: randPick(variedades),
          areaHa,
          dataPlantio: new Date(Date.now() - randInt(500, 1200) * 24 * 60 * 60 * 1000),
        },
      });

      const qtdColheitas = randInt(2, 5);
      for (let c = 0; c < qtdColheitas; c++) {
        const diasAtras = c * randInt(380, 430) + randInt(0, 120);
        const produtividade = randInt(78, 112) + Math.round(Math.random() * 10) / 10;
        await prisma.colheita.create({
          data: {
            talhaoId: talhao.id,
            data: new Date(Date.now() - diasAtras * 24 * 60 * 60 * 1000),
            tipo: tipos[c] ?? "ressoca",
            toneladas: Math.round(areaHa * produtividade * 10) / 10,
          },
        });
      }
    }
  }

  console.log("Seed concluído. Fazendas, talhões e colheitas criados.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });