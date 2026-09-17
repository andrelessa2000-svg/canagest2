"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/actions";
import { AlertaFormulario, BotaoSubmit, Campo } from "./forms";

const VARIEDADES = [
  "RB 867515",
  "RB 966928",
  "RB 72454",
  "SP 80-1842",
  "SP 81-3250",
  "CTC 4",
  "CTC 9001",
  "CTC 9002",
  "CTC 20",
];

export function TalhaoForm({
  acao,
  nomeFazenda,
  inicial,
}: {
  acao: (prev: ActionState | undefined, formData: FormData) => Promise<ActionState>;
  nomeFazenda: string;
  inicial?: { nome: string; variedade: string; area: number; dataPlantio: string };
}) {
  const [state, acaoForm] = useActionState(acao, undefined);

  return (
    <form action={acaoForm} className="grid gap-5 pb-4">
      <AlertaFormulario mensagem={state && !state.ok ? state.error : undefined} />

      <p className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-2">
        Fazenda: <span className="font-semibold text-ink">{nomeFazenda}</span>
      </p>

      <Campo
        label="Nome do talhão"
        htmlFor="nome"
        hint="Ex.: T-01, T-02… Use um identificador curto."
      >
        <input
          id="nome"
          name="nome"
          className="field-input"
          defaultValue={inicial?.nome}
          required
          autoFocus
          maxLength={20}
          placeholder="Ex.: T-01"
        />
      </Campo>

      <Campo label="Variedade de cana" htmlFor="variedade">
        <input
          id="variedade"
          name="variedade"
          className="field-input"
          defaultValue={inicial?.variedade}
          maxLength={40}
          list="variedades"
          placeholder="Ex.: RB 867515"
        />
        <datalist id="variedades">
          {VARIEDADES.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      </Campo>

      <div className="grid grid-cols-[1fr_1fr] gap-4">
        <Campo label="Área (ha)" htmlFor="area">
          <input
            id="area"
            name="area"
            className="field-input tnum"
            defaultValue={inicial ? String(inicial.area).replace(".", ",") : undefined}
            inputMode="decimal"
            required
            placeholder="Ex.: 42,5"
          />
        </Campo>
        <Campo label="Data de plantio" htmlFor="dataPlantio">
          <input
            id="dataPlantio"
            name="dataPlantio"
            type="date"
            className="field-input"
            defaultValue={inicial?.dataPlantio}
          />
        </Campo>
      </div>

      <div className="flex justify-end">
        <BotaoSubmit>{inicial ? "Salvar alterações" : "Cadastrar talhão"}</BotaoSubmit>
      </div>
    </form>
  );
}