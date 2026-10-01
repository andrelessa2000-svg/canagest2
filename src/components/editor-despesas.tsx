"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { fmtMoney, parseDecimal } from "@/lib/format";
import { Campo } from "./forms";

/**
 * Editor de despesas livres: nome + valor total.
 * Permite cargar várias de uma vez (plantio, semente, operação, etc.).
 *
 * A estrutura guardada é compatível com `insumosJson`/`lerDividas`:
 * [{ nome, quantidade, unidade, valorUnitario, valorTotal }]
 * aqui só se usa nome e valorTotal; quantidade/unidade/valorUnitario vão 0/"".
 */
export type Despesa = {
  nome: string;
  valor: string;
};

export function EditorDespesas({
  value,
  onChange,
  id = "despesas",
}: {
  value: Despesa[];
  onChange: (v: Despesa[]) => void;
  id?: string;
}) {
  const [draft, setDraft] = useState<Despesa>({ nome: "", valor: "" });

  function adicionar() {
    const nome = draft.nome.trim();
    const valor = parseDecimal(draft.valor);
    if (!nome || !Number.isFinite(valor) || valor <= 0) return;
    onChange([...value, { nome, valor: String(valor).replace(".", ",") }]);
    setDraft({ nome: "", valor: "" });
  }

  function remover(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  const total = value.reduce((s, d) => s + (Number(parseDecimal(d.valor)) || 0), 0);

  return (
    <div className="rounded-[10px] border border-dashed border-line-strong bg-surface/60 p-4">
      <p className="text-xs text-ink-3">
        Adicione despesas livres como plantio, semente, operações, transporte, etc.
        Pode carregar várias de uma vez.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_140px_auto] items-end">
        <Campo label="Nome da despesa" htmlFor={`${id}-nome`}>
          <input
            id={`${id}-nome`}
            className="field-input"
            value={draft.nome}
            onChange={(e) => setDraft({ ...draft, nome: e.target.value })}
            placeholder="Ex.: Plantio, Semente, Operações"
            maxLength={60}
          />
        </Campo>
        <Campo label="Valor (R$)" htmlFor={`${id}-valor`}>
          <input
            id={`${id}-valor`}
            className="field-input tnum"
            inputMode="decimal"
            value={draft.valor}
            onChange={(e) => setDraft({ ...draft, valor: e.target.value })}
            placeholder="0,00"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                adicionar();
              }
            }}
          />
        </Campo>
        <button
          type="button"
          onClick={adicionar}
          disabled={!draft.nome.trim() || !(Number(parseDecimal(draft.valor)) > 0)}
          className="btn btn-secondary h-10"
        >
          <Plus className="size-4" /> Adicionar
        </button>
      </div>

      {value.length > 0 && (
        <>
          <p className="mt-2 text-sm font-medium text-ink-2">Despesas cargadas</p>
          <ul className="mt-2 grid gap-2">
            {value.map((d, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2"
              >
                <span className="min-w-32 flex-1 text-sm font-medium text-ink">{d.nome}</span>
                <span className="tnum text-sm font-semibold text-ink">{fmtMoney(Number(parseDecimal(d.valor)))}</span>
                <button
                  type="button"
                  onClick={() => remover(i)}
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-line text-ink-3 transition-colors hover:border-danger-strong hover:text-danger-strong"
                  aria-label={`Remover ${d.nome}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          <div aria-live="polite" aria-atomic="true" className="mt-2">
            <p className="text-sm text-ink-2">
              Total despesas: <strong className="tnum text-ink">{fmtMoney(total)}</strong>
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export function despesasDeJson(bruto: unknown): Despesa[] {
  if (!Array.isArray(bruto)) return [];
  return bruto
    .filter(
      (d): d is Record<string, unknown> => !!d && typeof d === "object" && typeof d.nome === "string",
    )
    .map((d) => ({
      nome: String(d.nome),
      valor: String(d.valorTotal ?? d.valor ?? "").replace(".", ","),
    }));
}

export function despesasParaJson(despesas: Despesa[]): { nome: string; valorTotal: number }[] {
  return despesas.map((d) => ({
    nome: d.nome.trim(),
    valorTotal: Number(parseDecimal(d.valor)) || 0,
  }));
}