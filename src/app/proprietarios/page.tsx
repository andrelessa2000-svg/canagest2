import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { ProprietariosClient } from "@/components/proprietarios-client";
import {
  atualizarProprietario,
  criarProprietario,
  excluirProprietario,
} from "@/lib/actions";
import { userIdAtual } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProprietariosPage() {
  const donos = await prisma.proprietario.findMany({
    where: { userId: await userIdAtual() },
    include: {
      fazendas: { select: { talhoes: { select: { areaHa: true } } } },
    },
    orderBy: { nome: "asc" },
  });

  const linhas = donos.map((p) => ({
    id: p.id,
    nome: p.nome,
    fazendas: p.fazendas.length,
    areaHa: p.fazendas.reduce((a, f) => a + f.talhoes.reduce((t, x) => t + x.areaHa, 0), 0),
  }));

  return (
    <>
      <PageHeader
        rotulo="cadastro"
        titulo="Proprietários"
        descricao="Gerente de fazendas de vários donos? Cadastre cada dono aqui e vincule as fazendas dele para calcular área e insumos por proprietário."
      />
      <ProprietariosClient
        proprietarios={linhas}
        criar={criarProprietario}
        atualizar={atualizarProprietario}
        excluir={excluirProprietario}
      />
    </>
  );
}
