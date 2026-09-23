import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

const errores: Record<string, string> = {
  CredentialsSignin: "E-mail ou senha incorretos.",
  AccessDenied: "Acesso negado.",
  OAuthSignin: "Não foi possível entrar com Google.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;
  const errMsg = error
    ? (errores[error] ?? "Não foi possível iniciar sessão.")
    : null;
  const okMsg =
    ok === "1"
      ? "Conta criada. Inicia sessão."
      : ok === "2"
        ? "Senha atualizada. Inicia sessão."
        : null;

  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        rotulo="acesso"
        titulo="Iniciar sessão"
        descricao="Bem-vindo de volta a CanaGest."
      />
      {errMsg && (
        <p
          role="alert"
          className="rounded-lg border border-danger-strong/25 bg-danger-soft px-3 py-2 text-sm font-medium text-danger-strong"
        >
          {errMsg}
        </p>
      )}
      {okMsg && (
        <p className="rounded-lg border border-line bg-accent-soft px-3 py-2 text-sm font-medium text-accent-strong">
          {okMsg}
        </p>
      )}
      <div className="rounded-[10px] border border-line bg-surface p-6">
        <LoginForm
          googleHabilitado={Boolean(
            process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
          )}
        />
      </div>
      <p className="mt-4 text-sm text-ink-2">
        Você ainda não tem conta?{" "}
        <Link
          href="/registro"
          className="font-semibold text-accent underline underline-offset-2"
        >
          Criar uma
        </Link>
      </p>
      <p className="mt-2 text-sm text-ink-3">
        <Link href="/recuperar" className="underline underline-offset-2">
          Esqueci minha senha
        </Link>
      </p>
    </div>
  );
}