"use client";

import { useFormStatus } from "react-dom";

export function Campo({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={htmlFor} className="field-label">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-danger-strong">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

export function BotaoSubmit({
  children,
  pendente = "Salvando…",
}: {
  children: React.ReactNode;
  pendente?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn btn-primary"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? pendente : children}
    </button>
  );
}

export function AlertaFormulario({ mensagem }: { mensagem?: string }) {
  if (!mensagem) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-danger-strong/25 bg-danger-soft px-3 py-2 text-sm font-medium text-danger-strong"
    >
      {mensagem}
    </p>
  );
}