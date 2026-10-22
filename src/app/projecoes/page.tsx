import { PageHeader } from "@/components/page-header";
import { ProjecoesClient } from "@/components/projecoes-client";
import { prisma } from "@/lib/db";
import { userIdAtual } from "@/lib/auth";
import type { ProtocoloProj, ServicoComparacao } from "@/lib/projecoes";

export const dynamic = "force-dynamic";

function interpretarCustos(bruto: unknown): { nome: string; valor: number; unidade: "ha" | "total" }[] {
  if (!Array.isArray(bruto)) return [];
  return bruto
    .filter((c): c is { nome?: unknown; valor?: unknown; unidade?: unknown } => !!c && typeof c === "object")
    .map((c) => ({
      nome: String(c.nome ?? ""),
      valor: Number(c.valor) || 0,
      unidade: c.unidade === "total" ? "total" : ("ha" as const),
    }));
}

export default async function ProjecoesPage() {
  const userId = await userIdAtual();
  const [fazendas, servicosRaw, protocolosRaw] = await Promise.all([
    prisma.fazenda.findMany({
      where: { userId },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
    prisma.projecaoServico.findMany({
      where: { userId },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.projecaoProtocolo.findMany({
      where: { userId },
      orderBy: { criadoEm: "desc" },
    }),
  ]);

  const servicos: (ServicoComparacao & {
    id: string;
    safra: string | null;
    fazendaId: string | null;
    tipoExecucao: ServicoComparacao["tipoExecucao"];
    criadoEm: Date;
  })[] = servicosRaw.map((s) => ({
    id: s.id,
    nome: s.nome,
    safra: s.safra,
    fazendaId: s.fazendaId,
    tipo: s.tipo as ServicoComparacao["tipo"],
    tipoExecucao: s.tipoExecucao as ServicoComparacao["tipoExecucao"],
    areaHa: s.areaHa ?? 0,
    custos: interpretarCustos(s.custos),
    produtividade: s.produtividade,
    preco: s.precoMensal,
    criadoEm: s.criadoEm,
  }));

  const protocolos: (ProtocoloProj & {
    id: string;
    safra: string | null;
    fazendaId: string | null;
    criadoEm: Date;
  })[] = protocolosRaw.map((p) => ({
    id: p.id,
    nome: p.nome,
    safra: p.safra,
    fazendaId: p.fazendaId,
    areaHa: p.areaHa,
    produtividade: p.produtividade,
    preco: p.precoMensal,
    cortes: p.cortes,
    custos: interpretarCustos(p.custos),
    criadoEm: p.criadoEm,
  }));

  return (
    <>
      <PageHeader
        rotulo="planejamento"
        titulo="Projeções e comparações de custos"
        descricao="Planeje safras futuras: compare serviços agrícolas (execução própria vs terceirizada/usina) e descubra qual protocolo tem a maior rentabilidade. Dados independentes — nada é puxado do financeiro nem do caderno de campo."
      />
      <ProjecoesClient fazendas={fazendas} servicos={servicos} protocolos={protocolos} />
    </>
  );
}