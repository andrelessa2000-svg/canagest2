"use client";

import { useActionState } from "react";
import { solicitarRecuperacion } from "@/lib/auth-actions";
import { AlertaFormulario, BotaoSubmit, Campo } from "./forms";

export function RecuperarForm() {
  const [state, action] = useActionState(solicitarRecuperacion, undefined);

  return (
    <form action={action} className="grid gap-4">
      <AlertaFormulario mensagem={state && !state.ok ? state.error : undefined} />
      {state && state.ok && state.mensaje && (
        <p className="rounded-lg border border-line bg-surface-muted px-3 py-2 text-sm text-ink-2">
          {state.mensaje}
        </p>
      )}
      {state && state.ok && state.enlace && (
        <p className="rounded-lg border border-dashed border-line-strong bg-surface px-3 py-2 text-sm break-all text-ink-2">
          <span className="font-semibold text-ink">Link de recuperação:</span>{" "}
          <a href={state.enlace} className="underline underline-offset-2 text-accent">
            {state.enlace}
          </a>
        </p>
      )}
      <Campo label="E-mail" htmlFor="email">
        <input
          id="email"
          name="email"
          type="email"
          className="field-input"
          required
          autoFocus
          autoComplete="email"
        />
      </Campo>
      <BotaoSubmit>Enviar link</BotaoSubmit>
    </form>
  );
}