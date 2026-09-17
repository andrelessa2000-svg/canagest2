"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionState } from "@/lib/actions";
import { TIPOS_COLHEITA, type TipoColheita } from "@/lib/validators";
import { toDateInputValue } from "@/lib/format";
import { AlertaFormulario, BotaoSubmit, Campo } from "./forms";

export function ColheitaForm({
  acao,
  talhoes,
  tipoInicial,
  talhaoSelecionado,
}: {
  acao: (prev: ActionState | undefined, formData: FormData) => Promise<ActionState>;
  talhoes: { id: string; nome: string; fazendaNome: string; areaHa: number }[];
  tipoInicial?: TipoColheita;
  talhaoSelecionado?: string;
}) {
  const router = useRouter();
  const [state, acaoForm] = useActionState(acao, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Colheita registrada");
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  const grupos = talhoes.reduce<
    Record<string, { id: string; nome: string; areaHa: number }[]>
  >((acc, t) => {
    const chave = t.fazendaNome;
    (acc[chave] ??= []).push({ id: t.id, nome: t.nome, areaHa: t.areaHa });
    return acc;
  }, {});

  return (
    <form ref={formRef} action={acaoForm} className="grid gap-5 pb-4">
      <AlertaFormulario mensagem={state && !state.ok ? state.error : undefined} />

      <Campo label="Talhão" htmlFor="talhaoId">
        <select id="talhaoId" name="talhaoId" className="field-input" required defaultValue={talhaoSelecionado ?? ""}>
          <option value="" disabled>
            Selecione o talhão colhido…
          </option>
          {Object.entries(grupos).map(([fazenda, lista]) => (
            <optgroup key={fazenda} label={fazenda}>
              {lista.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} · {t.areaHa.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ha
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </Campo>

      <div className="grid grid-cols-[1fr_1fr] gap-4">
        <Campo label="Data da colheita" htmlFor="data">
          <input
            id="data"
            name="data"
            type="date"
            className="field-input"
            defaultValue={toDateInputValue(new Date())}
            required
          />
        </Campo>
        <Campo label="Tipo de corte" htmlFor="tipo">
          <select id="tipo" name="tipo" className="field-input" defaultValue={tipoInicial ?? "planta"}>
            {(Object.keys(TIPOS_COLHEITA) as TipoColheita[]).map((t) => (
              <option key={t} value={t}>
                {TIPOS_COLHEITA[t]}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <Campo
        label="Quantidade colhida (t)"
        htmlFor="toneladas"
        hint="Toneladas brutas. Aceita vírgula como decimal."
      >
        <input
          id="toneladas"
          name="toneladas"
          className="field-input tnum"
          inputMode="decimal"
          required
          placeholder="Ex.: 1.240,5"
        />
      </Campo>

      <Campo label="Observações" htmlFor="observacao" hint="Opcional — ex.: queimada, chuva, transporte.">
        <textarea
          id="observacao"
          name="observacao"
          className="field-input min-h-24 resize-y"
          maxLength={300}
          placeholder="Anotações do dia de colheita…"
        />
      </Campo>

      <div className="flex justify-end">
        <BotaoSubmit>Registrar colheita</BotaoSubmit>
      </div>
    </form>
  );
}