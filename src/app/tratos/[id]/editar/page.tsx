import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { atualizarTrato } from "@/lib/actions";
import { toDateInputValue } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { TratoForm } from "@/components/trato-form";

export const dynamic = "force-dynamic";

function numero(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 10 });
}

export default async function EditarTratoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [trato, fazendas, talhoes, safrasRaw] = await Promise.all([
    prisma.trato.findUnique({ where: { id } }),
    prisma.fazenda.findMany({
      select: { id: true, nome: true, talhoes: { select: { areaHa: true } } },
      orderBy: { nome: "asc" },
    }),
    prisma.talhao.findMany({
      select: { id: true, nome: true, fazendaId: true, areaHa: true },
      orderBy: { nome: "asc" },
    }),
    prisma.colheita.findMany({
      where: { safra: { not: null } },
      select: { safra: true },
      distinct: ["safra"],
      orderBy: { safra: "asc" },
    }),
  ]);

  if (!trato) notFound();

  const safras = safrasRaw.map((s) => s.safra).filter((s) => typeof s === "string");
  const produtos = (trato.produtos as unknown as {
    nome?: string;
    dose?: string;
    unidade?: string;
    quantidade?: number;
  }[]) ?? [];

  return (
    <>
      <Link
        href="/tratos"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-3 hover:text-ink"
      >
        <ChevronLeft className="size-4" /> Tratos
      </Link>
      <PageHeader rotulo="cultivos" titulo="Editar trato" />
      <div className="mx-auto max-w-2xl rounded-[10px] border border-line bg-surface p-5 sm:p-8">
        <TratoForm
          acao={atualizarTrato.bind(null, id)}
          fazendas={fazendas.map((f) => ({
            id: f.id,
            nome: f.nome,
            areaHa: f.talhoes.reduce((a, t) => a + t.areaHa, 0),
          }))}
          talhoes={talhoes}
          safras={safras}
          inicial={{
            fazendaId: trato.fazendaId,
            talhaoId: trato.talhaoId ?? "",
            safra: trato.safra ?? "",
            tipo: trato.tipo,
            escopo: trato.escopo,
            tarefas: numero(trato.tarefas),
            data: toDateInputValue(trato.data),
            valor: numero(trato.valor),
            projecao: trato.projecao,
            observacao: trato.observacao ?? "",
            produtos: produtos.map((p) => ({
              nome: p.nome ?? "",
              dose: p.dose ?? "",
              unidade: p.unidade ?? "L/ha",
              quantidade: p.quantidade === undefined ? "" : numero(p.quantidade),
            })),
          }}
        />
      </div>
    </>
  );
}