import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Calculadoras } from "@/components/calculadoras";
import { userIdAtual } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CalculadorasPage() {
  const donos = await prisma.proprietario.findMany({
    where: { userId: await userIdAtual() },
    select: {
      id: true,
      nome: true,
      fazendas: { select: { talhoes: { select: { areaHa: true } } } },
    },
    orderBy: { nome: "asc" },
  });

  return (
    <>
      <PageHeader
        rotulo="cálculos"
        titulo="Calculadoras"
        descricao="Conversões de área, adubo por tarefa e por proprietário, calda de herbicida e muda de cana."
      />
      <Calculadoras
        donos={donos.map((d) => ({
          id: d.id,
          nome: d.nome,
          areaHa: d.fazendas.reduce((a, f) => a + f.talhoes.reduce((t, x) => t + x.areaHa, 0), 0),
        }))}
      />
    </>
  );
}
