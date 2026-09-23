"use client";

import { useActionState } from "react";
import { registrarUsuario } from "@/lib/auth-actions";
import { AlertaFormulario, BotaoSubmit, Campo } from "./forms";

export function RegistroForm() {
  const [state, action] = useActionState(registrarUsuario, undefined);

  return (
    <form action={action} className="grid gap-4">
      <AlertaFormulario mensagem={state && !state.ok ? state.error : undefined} />
      <Campo label="Nome" htmlFor="nome">
        <input
          id="nome"
          name="nome"
          className="field-input"
          required
          autoFocus
          maxLength={80}
          autoComplete="name"
        />
      </Campo>
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
      <Campo label="Senha" htmlFor="password" hint="Mínimo 8 caracteres.">
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
      <BotaoSubmit>Criar conta</BotaoSubmit>
    </form>
  );
}