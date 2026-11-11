"use client";

import { useState } from "react";
import { Check, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { ActionState } from "@/lib/actions";
import { fmtCount, fmtHa, fmtTarefas } from "@/lib/format";
import { Campo } from "./forms";
import { ConfirmDelete } from "./confirm-delete";

export type ProprietarioLinha = {
  id: string;
  nome: string;
  fazendas: number;
  areaHa: number;
};

function LinhaEdicao({
  p,
  atualizar,
  aoCancelar,
}: {
  p: ProprietarioLinha;
  atualizar: (id: string, prev: ActionState | undefined, formData: FormData) => Promise<ActionState>;
  aoCancelar: () => void;
}) {
  async function acaoForm(fd: FormData) {
    const r = await atualizar(p.id, undefined, fd);
    if (r.ok) {
      toast.success("Proprietário atualizado");
      aoCancelar();
    } else {
      toast.error(r.error);
    }
  }

  return (
    <form action={acaoForm} className="flex w-full items-center gap-2">
      <input
        name="nome"
        className="field-input"
        defaultValue={p.nome}
        autoFocus
        required
        maxLength={80}
        aria-label="Nome do proprietário"
      />
      <button
        type="submit"
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-surface transition-colors hover:bg-accent-strong"
        aria-label="Salvar nome"
      >
        <Check className="size-4" />
      </button>
      <button
        type="button"
        onClick={aoCancelar}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-ink-3 transition-colors hover:border-line-strong hover:bg-surface-muted hover:text-ink"
        aria-label="Cancelar edição"
      >
        <X className="size-4" />
      </button>
    </form>
  );
}

export function ProprietariosClient({
  proprietarios,
  criar,
  atualizar,
  excluir,
}: {
  proprietarios: ProprietarioLinha[];
  criar: (prev: ActionState | undefined, formData: FormData) => Promise<ActionState>;
  atualizar: (id: string, prev: ActionState | undefined, formData: FormData) => Promise<ActionState>;
  excluir: (id: string) => Promise<void>;
}) {
  const [nome, setNome] = useState("");
  const [editando, setEditando] = useState<string | null>(null);

  async function acaoCriar(fd: FormData) {
    const r = await criar(undefined, fd);
    if (r.ok) {
      toast.success("Proprietário cadastrado");
      setNome("");
    } else {
      toast.error(r.error);
    }
  }

  return (
    <div className="grid gap-5">
      <form action={acaoCriar} className="grid gap-3 rounded-[10px] border border-line bg-surface p-4 sm:p-5">
        <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto]">
          <Campo label="Nome do proprietário" htmlFor="nomeProprietario">
            <input
              id="nomeProprietario"
              name="nome"
              className="field-input"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Paulo"
              required
              maxLength={80}
            />
          </Campo>
          <button type="submit" className="btn btn-primary">
            <Plus className="size-4" /> Cadastrar
          </button>
        </div>
        <p className="text-xs text-ink-3">
          Depois, na fazenda, escolha quem é o dono — assim o app soma a área e os insumos por
          proprietário.
        </p>
      </form>

      {proprietarios.length > 0 && (
        <ul className="divide-y divide-line rounded-[10px] border border-line bg-surface px-3">
          {proprietarios.map((p) => (
            <li key={p.id} className="-mx-2 flex items-center gap-2 px-2 py-3">
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="truncate text-sm font-medium text-ink">{p.nome}</span>
                <span className="flex flex-wrap items-center gap-x-2 text-xs text-ink-3">
                  <span>
                    {p.fazendas} {p.fazendas === 1 ? "fazenda" : "fazendas"}
                  </span>
                  {p.fazendas > 0 && (
                    <>
                      <span aria-hidden>·</span>
                      <span>{fmtTarefas(p.areaHa)}</span>
                      <span aria-hidden>·</span>
                      <span>{fmtHa(p.areaHa)}</span>
                    </>
                  )}
                </span>
              </span>
              {editando === p.id ? (
                <LinhaEdicao p={p} atualizar={atualizar} aoCancelar={() => setEditando(null)} />
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setEditando(p.id)}
                    className="inline-flex size-9 items-center justify-center rounded-lg border border-transparent text-ink-3 transition-colors hover:border-line-strong hover:bg-surface-muted hover:text-ink"
                    aria-label={`Editar ${p.nome}`}
                  >
                    <Pencil className="size-4" />
                  </button>
                  <ConfirmDelete
                    action={() => excluir(p.id)}
                    titulo="Excluir proprietário?"
                    mensagem={`"${p.nome}" será apagado. As fazendas dele continuam no app, só deixam de ter dono informado.`}
                    verbo="Excluir"
                    modo="stay"
                    rotuloAria={`Excluir ${p.nome}`}
                  />
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="px-1 text-xs text-ink-3">
        {fmtCount(proprietarios.length)}{" "}
        {proprietarios.length === 1 ? "proprietário cadastrado" : "proprietários cadastrados"}
      </p>
    </div>
  );
}
