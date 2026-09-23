import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { RedefinirForm } from "@/components/redefinir-form";

export const dynamic = "force-dynamic";

export default async function RedefinirPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="mx-auto max-w-md">
        <PageHeader
          rotulo="acceso"
          titulo="Link inválido"
          descricao="Falta o token de recuperação no enlace."
        />
        <Link href="/recuperar" className="font-semibold text-accent underline underline-offset-2">
          Solicitar um novo link
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        rotulo="acceso"
        titulo="Redefinir senha"
        descricao="Escolha uma nova senha para sua conta."
      />
      <div className="rounded-[10px] border border-line bg-surface p-6">
        <RedefinirForm token={token} />
      </div>
    </div>
  );
}