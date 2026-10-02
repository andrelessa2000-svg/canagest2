"use client";

import { useActionState, useRef } from "react";
import { toast } from "sonner";
import type { ActionState } from "@/lib/actions";
import { MESES } from "@/lib/historico-preco";
import { AlertaFormulario, BotaoSubmit, Campo } from "./forms";

const ANO_MIN = 2000;
const ANO_MAX = 2100;

export function PrecoForm({ acao }: { acao: (prev: ActionState | undefined, formData: FormData) => Promise<ActionState> }) {
  const [state, acaoForm] = useActionState(async (prev: ActionState | undefined, fd: FormData) => {
    const r = await acao(prev, fd);
    if (r.ok) {
      toast.success(r.mensagem ?? "Preço salvo");
      formRef.current?.reset();
    }
    return r;
  }, undefined);

  const formRef = useRef<HTMLFormElement>(null);
  const anoAtual = new Date().getFullYear();
  const anos = Array.from({ length: ANO_MAX - ANO_MIN + 1 }, (_, i) => ANO_MAX - i).filter(
    (a) => a >= ANO_MIN && a <= anoAtual + 2,
  );

  return (
    <form ref={formRef} action={acaoForm} className="grid gap-5">
      <AlertaFormulario mensagem={state && !state.ok ? state.error : undefined} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Mês" htmlFor="mes">
          <select id="mes" name="mes" className="field-input" defaultValue="" required>
            <option value="" disabled>
              Selecione
            </option>
            {MESES.map((nome, i) => (
              <option key={nome} value={i + 1}>
                {nome}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Ano" htmlFor="ano">
          <select id="ano" name="ano" className="field-input" defaultValue={anoAtual} required>
            {anos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <Campo
        label="Preço médio da cana (R$/t)"
        htmlFor="precoMedio"
        hint="Opcional — pode registrar só o ATR. Valor líquido por tonelada que você recebe da usina."
      >
        <input
          id="precoMedio"
          name="precoMedio"
          className="field-input tnum"
          inputMode="decimal"
          placeholder="164,00"
        />
      </Campo>

      <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
        <Campo
          label="ATR (kg ATR/t)"
          htmlFor="atrPorTonelada"
          hint="Opcional — só preencha se a usina remunera por ATR."
        >
          <input
            id="atrPorTonelada"
            name="atrPorTonelada"
            className="field-input tnum"
            inputMode="decimal"
            placeholder="140"
          />
        </Campo>

        <Campo
          label="Preço do kg ATR (R$/kg)"
          htmlFor="precoKgAtr"
          hint="Opcional — complementa o ATR acima."
        >
          <input
            id="precoKgAtr"
            name="precoKgAtr"
            className="field-input tnum"
            inputMode="decimal"
            placeholder="0,145"
          />
        </Campo>
      </div>

      <Campo
        label="Fonte (opcional)"
        htmlFor="fonte"
        hint="Ex.: moagem própria, CONAB, usina."
      >
        <input id="fonte" name="fonte" className="field-input" maxLength={60} placeholder="Usina Pindorama" />
      </Campo>

      <div className="flex justify-end">
        <BotaoSubmit>Salvar preço</BotaoSubmit>
      </div>
    </form>
  );
}
