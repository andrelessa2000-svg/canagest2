import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export default function NotFoundPage() {
  return (
    <>
      <PageHeader
        rotulo="erro 404"
        titulo="Página não encontrada"
        descricao="O registro ou a página que você procura não existe mais."
      />
      <div className="grid place-items-center gap-4 py-10 text-center">
        <span className="grid size-14 place-items-center rounded-[10px] bg-accent-soft text-accent">
          <FileQuestion className="size-7" strokeWidth={1.8} />
        </span>
        <Link href="/" className="btn btn-primary">
          Voltar ao início
        </Link>
      </div>
    </>
  );
}