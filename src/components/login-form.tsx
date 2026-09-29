"use client";

import { useEffect, useState } from "react";
import { getCsrfToken, signIn } from "next-auth/react";
import { Campo } from "./forms";

// Uma única requisição de CSRF por carregamento da página. Em desenvolvimento o
// React executa o efeito duas vezes; duas requisições simultâneas gravam cookies
// diferentes e o token do formulário podia não bater com o cookie (MissingCSRF).
let csrfEmAndamento: Promise<string | undefined> | null = null;
function obterCsrf() {
  if (!csrfEmAndamento) {
    csrfEmAndamento = getCsrfToken().catch(() => undefined);
    // Some do cache logo depois, para um login posterior buscar um token novo.
    setTimeout(() => {
      csrfEmAndamento = null;
    }, 2000);
  }
  return csrfEmAndamento;
}

export function LoginForm({ googleHabilitado }: { googleHabilitado: boolean }) {
  const [csrf, setCsrf] = useState("");

  useEffect(() => {
    obterCsrf().then((t) => setCsrf(t ?? ""));
  }, []);

  return (
    <div className="grid gap-4">
      {googleHabilitado && (
        <button
          type="button"
          onClick={() => signIn("google")}
          className="btn btn-soft w-full"
        >
          Continuar com Google
        </button>
      )}

      <form
        method="post"
        action="/api/auth/callback/credentials"
        className="grid gap-3"
      >
        <input type="hidden" name="csrfToken" value={csrf} />
        <input type="hidden" name="callbackUrl" value="/" />
        <Campo label="E-mail" htmlFor="email">
          <input
            id="email"
            name="email"
            type="email"
            className="field-input"
            required
            autoComplete="email"
          />
        </Campo>
        <Campo label="Senha" htmlFor="password">
          <input
            id="password"
            name="password"
            type="password"
            className="field-input"
            required
            autoComplete="current-password"
          />
        </Campo>
        <button type="submit" className="btn btn-primary" disabled={!csrf}>
          Entrar
        </button>
      </form>
    </div>
  );
}