import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { PerfilForm, SenhaForm } from "@/components/perfil-form";
import { BotaoSair } from "@/components/botao-sair";

export const dynamic = "force-dynamic";

export default async function CuentaPage() {
  let session;
  try {
    session = await auth();
  } catch {
    session = null;
  }
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { accounts: { select: { provider: true } } },
  });
  if (!user) redirect("/login");

  const contaGoogle = user.accounts.some((a) => a.provider === "google");

  return (
    <>
      <PageHeader
        rotulo="cuenta"
        titulo="Minha conta"
        descricao="Dados de perfil e acesso ao CanaGest."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="ledger-panel p-5 sm:p-6">
          <h2 className="font-display text-lg text-ink">Perfil</h2>
          <p className="mt-1 text-xs text-ink-3">
            E-mail: <span className="font-semibold text-ink">{user.email}</span>
            {contaGoogle ? " · conta vinculada ao Google" : ""}
          </p>
          <div className="mt-3">
            <PerfilForm nome={user.name ?? ""} image={user.image} />
          </div>
        </section>

        <section className="ledger-panel p-5 sm:p-6">
          <h2 className="font-display text-lg text-ink">Trocar senha</h2>
          {user.passwordHash ? (
            <div className="mt-3">
              <SenhaForm />
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-2">
              Você entrou com Google, esta conta não usa senha.
            </p>
          )}
        </section>
      </div>

      <div className="mt-8 flex justify-end">
        <BotaoSair />
      </div>
    </>
  );
}