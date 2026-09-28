"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { fmtTarefas, parseDecimal, TAREFAS_POR_HA } from "@/lib/format";
import { Campo } from "./forms";

export type TalhaoPorcao = { id: string; nome: string; areaHa: number };

export type Alocacao = { talhaoId: string; tarefas: string; completo: boolean };

export function SeletorPorcoes({
  talhoes,
  value,
  onChange,
  id = "porcoes",
}: {
  talhoes: TalhaoPorcao[];
  value: Alocacao[];
  onChange: (v: Alocacao[]) => void;
  id?: string;
}) {
  const [escolhido, setEscolhido] = useState("");

  const totalTarefas = alocacoesParaJson(value, talhoes).tarefasTotais;
  const areaTotal = totalTarefas / TAREFAS_POR_HA;

  function adicionar(talhaoId: string, completo: boolean) {
    if (!talhaoId || value.some((a) => a.talhaoId === talhaoId)) return;
    onChange([...value, { talhaoId, tarefas: "", completo }]);
    setEscolhido("");
  }

  function atualizar(i: number, patch: Partial<Alocacao>) {
    onChange(value.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  }

  const disponiveis = talhoes.filter((t) => !value.some((a) => a.talhaoId === t.id));
  const br = (n: number) => n.toFixed(2).replace(".", ",");

  return (
    <div className="rounded-[10px] border border-dashed border-line-strong bg-surface/60 p-4">
      <p className="text-xs text-ink-3">
        Adicione os talhões. Em cada um, marque <strong>todo</strong> ou informe só a parte
        aplicada. Você pode misturar talhões inteiros e partes de outros.
      </p>

      {value.length > 0 && (
        <ul className="mt-3 grid gap-2">
          {value.map((a, i) => {
            const t = talhoes.find((x) => x.id === a.talhaoId);
            return (
              <li
                key={a.talhaoId}
                className="flex flex-wrap items-end gap-2 rounded-lg border border-line bg-surface px-3 py-2"
              >
                <span className="min-w-32 flex-1 text-sm font-medium text-ink">
                  {t?.nome ?? "Talhão"}
                </span>

                {a.completo ? (
                  <span className="rounded-md bg-accent-soft px-2 py-1 text-xs font-semibold text-accent-strong">
                    Todo o talhão · {fmtTarefas(t ? t.areaHa : 0)}
                  </span>
                ) : (
                  <label className="grid gap-1">
                    <span className="field-label text-[10px]">Tarefas desta parte</span>
                    <input
                      className="field-input tnum w-32"
                      inputMode="decimal"
                      value={a.tarefas}
                      onChange={(e) => atualizar(i, { tarefas: e.target.value })}
                      placeholder="0"
                    />
                  </label>
                )}

                <button
                  type="button"
                  onClick={() => atualizar(i, { completo: !a.completo })}
                  className="btn btn-ghost text-xs"
                >
                  {a.completo ? "Aplicar só parte" : "Aplicar todo"}
                </button>

                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-line text-ink-3 transition-colors hover:border-danger-strong hover:text-danger-strong"
                  aria-label={`Remover ${t?.nome ?? "talhão"}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {value.length > 0 && (
        <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2 text-sm text-ink-2">
          Total: <strong className="tnum">{br(totalTarefas)} tarefas</strong> ·{" "}
          <strong className="tnum">{br(areaTotal)} ha</strong>
        </p>
      )}

      {disponiveis.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <Campo label="Talhão" htmlFor={`${id}-escolher`}>
            <select
              id={`${id}-escolher`}
              className="field-input"
              value={escolhido}
              onChange={(e) => setEscolhido(e.target.value)}
            >
              <option value="">Selecione…</option>
              {disponiveis.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} · {fmtTarefas(t.areaHa)}
                </option>
              ))}
            </select>
          </Campo>
          <button
            type="button"
            onClick={() => adicionar(escolhido, true)}
            disabled={!escolhido}
            className="btn btn-secondary"
          >
            <Plus className="size-4" /> Talhão todo
          </button>
          <button
            type="button"
            onClick={() => adicionar(escolhido, false)}
            disabled={!escolhido}
            className="btn btn-ghost"
          >
            <Plus className="size-4" /> Só uma parte
          </button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-ink-2">
          Todos os talhões desta fazenda já foram adicionados.
        </p>
      )}
    </div>
  );
}

export function alocacoesParaJson(
  alocacoes: Alocacao[],
  talhoes: TalhaoPorcao[],
): {
  alocacoes: { talhaoId: string; tarefas: number | null; completo: boolean }[];
  talhoesIds: string[];
  tarefasTotais: number;
} {
  const lista = alocacoes.map((a) => {
    const t = talhoes.find((x) => x.id === a.talhaoId);
    const tarefas = a.completo
      ? Number(((t ? t.areaHa : 0) * TAREFAS_POR_HA).toFixed(2))
      : Number(parseDecimal(a.tarefas)) || 0;
    return { talhaoId: a.talhaoId, tarefas, completo: a.completo };
  });
  return {
    alocacoes: lista,
    talhoesIds: lista.map((a) => a.talhaoId),
    tarefasTotais: Number(lista.reduce((s, a) => s + (a.tarefas ?? 0), 0).toFixed(2)),
  };
}

export function alocacoesDeJson(bruto: unknown): Alocacao[] {
  if (!Array.isArray(bruto)) return [];
  return bruto
    .filter(
      (a): a is { talhaoId: string; tarefas?: number | null; completo?: boolean } =>
        !!a && typeof a === "object" && typeof (a as { talhaoId?: unknown }).talhaoId === "string",
    )
    .map((a) => {
      const completo = a.completo === true || a.tarefas === null;
      return {
        talhaoId: a.talhaoId,
        completo,
        tarefas: completo || a.tarefas === undefined || a.tarefas === null
          ? ""
          : String(a.tarefas).replace(".", ","),
      };
    });
}
