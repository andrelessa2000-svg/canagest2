"use client";

import { useActionState } from "react";
import { redefinirSenha } from "@/lib/auth-actions";
import { AlertaFormulario, BotaoSubmit, Campo } from "./forms";

export function RedefinirForm({ token }: { token: string }) {
  const [state, action] = useActionState(redefinirSenha, undefined);

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="token" value={token} />
      <AlertaFormulario mensagem={state && !state.ok ? state.error : undefined} />
      <Campo label="Nova senha" htmlFor="password" hint="Mínimo 8 caracteres.">
        <input
          id="password"
          name="password"
          type="password"
          className="field-input"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </Campo>
      <Campo label="Repetir senha" htmlFor="confirmar">
        <input
          id="confirmar"
          name="confirmar"
          type="password"
          className="field-input"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </Campo>
      <BotaoSubmit>Redefinir senha</BotaoSubmit>
    </form>
  );
}