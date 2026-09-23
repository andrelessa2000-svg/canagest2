"use client";

import { useActionState, useState } from "react";
import { atualizarPerfil, cambiarSenha } from "@/lib/auth-actions";
import { AlertaFormulario, BotaoSubmit, Campo } from "./forms";

export function PerfilForm({
  nome,
  image,
}: {
  nome: string;
  image?: string | null;
}) {
  const [state, action] = useActionState(atualizarPerfil, undefined);
  const [foto, setFoto] = useState(image ?? "");
  const [nomeState, setNome] = useState(nome);

  function aoEscogerArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) return;
    const reader = new FileReader();
    reader.onload = () => setFoto(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <form action={action} className="grid gap-4">
      <AlertaFormulario mensagem={state && !state.ok ? state.error : undefined} />
      {state && state.ok && state.mensaje && (
        <p className="rounded-lg border border-line bg-accent-soft px-3 py-2 text-sm text-accent-strong">
          {state.mensaje}
        </p>
      )}

      <div className="flex items-center gap-3">
        {foto ? (
          <img
            src={foto}
            alt=""
            className="size-16 rounded-full border border-line object-cover"
          />
        ) : (
          <span className="grid size-16 place-items-center rounded-full bg-accent-soft font-display text-2xl text-accent">
            {nomeState.trim().slice(0, 1).toUpperCase() || "?"}
          </span>
        )}
        <label className="btn btn-ghost">
          Enviar foto
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={aoEscogerArchivo}
          />
        </label>
      </div>
      <input type="hidden" name="image" value={foto} />

      <Campo label="Nome" htmlFor="nome">
        <input
          id="nome"
          name="nome"
          className="field-input"
          required
          value={nomeState}
          onChange={(e) => setNome(e.target.value)}
          maxLength={80}
        />
      </Campo>

      <div className="flex justify-end">
        <BotaoSubmit>Salvar perfil</BotaoSubmit>
      </div>
    </form>
  );
}

export function SenhaForm() {
  const [state, action] = useActionState(cambiarSenha, undefined);

  return (
    <form action={action} className="grid gap-4">
      <AlertaFormulario mensagem={state && !state.ok ? state.error : undefined} />
      {state && state.ok && state.mensaje && (
        <p className="rounded-lg border border-line bg-accent-soft px-3 py-2 text-sm text-accent-strong">
          {state.mensaje}
        </p>
      )}
      <Campo label="Senha atual" htmlFor="atual">
        <input
          id="atual"
          name="atual"
          type="password"
          className="field-input"
          autoComplete="current-password"
        />
      </Campo>
      <Campo label="Nova senha" htmlFor="nova" hint="Mínimo 8 caracteres.">
        <input
          id="nova"
          name="nova"
          type="password"
          className="field-input"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </Campo>
      <Campo label="Repetir nova senha" htmlFor="confirmar">
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
      <div className="flex justify-end">
        <BotaoSubmit>Trocar senha</BotaoSubmit>
      </div>
    </form>
  );
}