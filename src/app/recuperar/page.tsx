import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { RecuperarForm } from "@/components/recuperar-form";

export const dynamic = "force-dynamic";

export default async function RecuperarPage() {
  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        rotulo="acesso"
        titulo="Recuperar senha"
        descricao="Digite seu e-mail para receber um link de recuperação."
      />
      <div className="rounded-[10px] border border-line bg-surface p-6">
        <RecuperarForm />
      </div>
      <p className="mt-4 text-sm text-ink-3">
        <Link href="/login" className="underline underline-offset-2">
          Voltar a iniciar sessão
        </Link>
      </p>
    </div>
  );
}