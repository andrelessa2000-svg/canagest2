import Link from "next/link";
import { Plus, Sprout } from "lucide-react";
import { prisma } from "@/lib/db";
import { fmtArea, fmtCount } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { LinhaLink } from "@/components/stat-cells";

export const dynamic = "force-dynamic";

export default async function FazendasPage() {
  const fazendas = await prisma.fazenda.findMany({
    include: { talhoes: { select: { id: true, areaHa: true } } },
    orderBy: { nome: "asc" },
  });

  const areaColhivel = fazendas.reduce(
    (acc, f) => acc + f.talhoes.reduce((a, t) => a + t.areaHa, 0),
    0,
  );

  return (
    <>
      <PageHeader
        rotulo="cadastro"
        titulo="Fazendas"
        descricao="As unidades produtoras cadastradas no seu caderno de campo."
        acao={
          <Link href="/fazendas/nova" className="btn btn-primary">
            <Plus className="size-4" /> Nova fazenda
          </Link>
        }
      />

      {fazendas.length === 0 ? (
        <EmptyState
          icone={Sprout}
          titulo="Nenhuma fazenda ainda"
          descricao="Cadastre a primeira fazenda para começar a estruturar seus talhões."
          ctaTexto="Cadastrar fazenda"
          ctaHref="/fazendas/nova"
        />
      ) : (
        <div className="grid gap-3">
          <ul className="divide-y divide-line rounded-[10px] border border-line bg-surface px-3">
            {fazendas.map((f) => (
              <LinhaLink
                key={f.id}
                href={`/fazendas/${f.id}`}
                principal={f.nome}
                secundario={
                  <>
                    <span>{[f.cidade, f.uf].filter(Boolean).join(" · ")}</span>
                    <span aria-hidden>·</span>
                    <span>
                      {f.talhoes.length}
                      {f.talhoes.length === 1 ? " talhão" : " talhões"}
                    </span>
                  </>
                }
                destaque={fmtArea(f.areaTotalHa)}
              />
            ))}
          </ul>
          <p className="px-1 text-xs text-ink-3">
            {fmtCount(fazendas.length)} fazendas ·{" "}
            {fmtArea(areaColhivel)} total em talhões
          </p>
        </div>
      )}
    </>
  );
}