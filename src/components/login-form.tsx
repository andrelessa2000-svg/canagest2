"use client";

import { useEffect, useState } from "react";
import { getCsrfToken, signIn } from "next-auth/react";
import { Campo } from "./forms";

export function LoginForm({ googleHabilitado }: { googleHabilitado: boolean }) {
  const [csrf, setCsrf] = useState("");

  useEffect(() => {
    getCsrfToken()
      .then((t) => setCsrf(t ?? ""))
      .catch(() => setCsrf(""));
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