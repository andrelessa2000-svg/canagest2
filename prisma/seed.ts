import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL não definida no ambiente.");
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

const tipos = ["planta", "soca", "ressoca"];

const modelosUsina = [
  { nome: "Usina Pindorama", modelo: "pindorama" },
  { nome: "Usina Coruripe", modelo: "coruripe" },
];

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rand(n: number, casas = 2) {
  const f = 10 ** casas;
  return Math.round(Math.random() * n * f) / f;
}

async function main() {
  const usinas = [];
  for (const def of modelosUsina) {
    usinas.push(
      await prisma.usina.upsert({
        where: { nome: def.nome },
        update: { modelo: def.modelo },
        create: def,
      }),
    );
  }

  const fazendas = [
    { nome: "Fazenda Boa Vista" },
    { nome: "Fazenda Santa Clara" },
    { nome: "Fazenda São José" },
  ];

  for (const def of fazendas) {
    const fazenda = await prisma.fazenda.create({
      data: {
        nome: def.nome,
      },
    });

    const qtdTalhoes = randInt(4, 7);
    for (let t = 1; t <= qtdTalhoes; t++) {
      const areaHa = randInt(18, 70) + Math.round(Math.random() * 10) / 10;
      const talhao = await prisma.talhao.create({
        data: {
          fazendaId: fazenda.id,
          nome: `T-${String(t).padStart(2, "0")}`,
          areaHa,
        },
      });

      const qtdColheitas = randInt(2, 5);
      for (let cIdx = 0; cIdx < qtdColheitas; cIdx++) {
        const diasAtras = cIdx * randInt(380, 430) + randInt(0, 120);
        const produtividade = randInt(78, 112) + Math.round(Math.random() * 10) / 10;
        const toneladas = Math.round(areaHa * produtividade * 10) / 10;
        const usina = usinas[(t + cIdx) % usinas.length];

        const despesas = {
          despCorte: rand(9000),
          despTransporte: rand(6000),
          despOutrasColheita: rand(1500),
          despPlantioUsina: rand(2000),
          despArrendamento: rand(5000),
          despAdubacao: rand(3500),
          despHerbicida: rand(1200),
          despOutras: rand(800),
        };

        const remuneracao =
          usina.modelo === "coruripe"
            ? {
                atrPorTonelada: rand(15, 3) + 115,
                precoKgAtr: rand(0.2, 4) + 1,
                complemento: rand(4000),
                outrosAdicionais: rand(1200),
              }
            : {
                valorTonelada: rand(20, 5) + 139,
                complemento: rand(9000),
                complementoTipo: cIdx % 2 === 0 ? "total" : "por_tonelada",
              };

        await prisma.colheita.create({
          data: {
            talhaoId: talhao.id,
            usinaId: usina.id,
            data: new Date(Date.now() - diasAtras * 24 * 60 * 60 * 1000),
            tipo: tipos[cIdx] ?? "ressoca",
            toneladas,
            ...remuneracao,
            ...despesas,
          },
        });
      }
    }
  }

  console.log("Seed concluído. Usinas, fazendas, talhões e colheitas criados.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });