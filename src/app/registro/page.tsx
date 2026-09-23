import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { RegistroForm } from "@/components/registro-form";

export const dynamic = "force-dynamic";

export default async function RegistroPage() {
  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        rotulo="nova conta"
        titulo="Criar conta"
        descricao="Crie sua conta para usar CanaGest. (Login com Google estará disponível depois.)"
      />
      <div className="rounded-[10px] border border-line bg-surface p-6">
        <RegistroForm />
      </div>
      <p className="mt-4 text-sm text-ink-2">
        Já tens conta?{" "}
        <Link
          href="/login"
          className="font-semibold text-accent underline underline-offset-2"
        >
          Iniciar sessão
        </Link>
      </p>
    </div>
  );
}