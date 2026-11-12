import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { criarTrato } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { TratoForm } from "@/components/trato-form";
import { userIdAtual } from "@/lib/auth";
import { safrasDoUsuario } from "@/lib/safras-usuario";

export const dynamic = "force-dynamic";

export default async function NovoTratoPage() {
  const [fazendas, talhoes, safras, proprietarios] = await Promise.all([
    prisma.fazenda.findMany({
      where: { userId: await userIdAtual() },
      select: {
        id: true,
        nome: true,
        proprietarioId: true,
        talhoes: { select: { areaHa: true } },
      },
      orderBy: { nome: "asc" },
    }),
    prisma.talhao.findMany({
      where: { userId: await userIdAtual() },
      select: { id: true, nome: true, fazendaId: true, areaHa: true },
      orderBy: { nome: "asc" },
    }),
    safrasDoUsuario(),
    prisma.proprietario.findMany({
      where: { userId: await userIdAtual() },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
  ]);


  return (
    <>
      <Link
        href="/tratos"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-3 hover:text-ink"
      >
        <ChevronLeft className="size-4" /> Tratos
      </Link>
      <PageHeader
        rotulo="cultivos"
        titulo="Novo trato"
        descricao="Registre adubação, herbicida e demais tratos — por fazenda, talhão ou pelas fazendas de um dono."
      />
      <div className="mx-auto max-w-2xl rounded-[10px] border border-line bg-surface p-5 sm:p-8">
        <TratoForm
          acao={criarTrato}
          fazendas={fazendas.map((f) => ({
            id: f.id,
            nome: f.nome,
            areaHa: f.talhoes.reduce((a, t) => a + t.areaHa, 0),
            proprietarioId: f.proprietarioId,
          }))}
          talhoes={talhoes}
          safras={safras}
          proprietarios={proprietarios}
        />
      </div>
    </>
  );
}