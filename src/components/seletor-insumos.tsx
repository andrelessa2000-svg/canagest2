"use client";

import { useState } from "react";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { fmtMoney, parseDecimal } from "@/lib/format";
import { Campo } from "./forms";

export type Insumo = {
  talhaoId?: string;
  nome: string;
  quantidade: string;
  unidade: string;
  valorUnitario: string;
  valorTotal: string;
};

const UNIDADES = ["L", "kg", "un", "t", "ha"];

export function SeletorInsumos({
  talhoes,
  value,
  onChange,
  alocacoes = [],
  id = "insumos",
}: {
  talhoes: { id: string; nome: string }[];
  value: Insumo[];
  onChange: (v: Insumo[]) => void;
  alocacoes?: { talhaoId: string }[];
  id?: string;
}) {
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState<Insumo>({
    talhaoId: "",
    nome: "",
    quantidade: "",
    unidade: "L",
    valorUnitario: "",
    valorTotal: "",
  });

  const talhoesDisponiveis = alocacoes.length > 0
    ? talhoes.filter((t) => alocacoes.some((a) => a.talhaoId === t.id))
    : talhoes;

  function recalcular() {
    const q = Number(parseDecimal(draft.quantidade)) || 0;
    const vu = Number(parseDecimal(draft.valorUnitario)) || 0;
    setDraft({ ...draft, valorTotal: (q * vu).toFixed(2) });
  }

  function adicionar() {
    if (!draft.nome.trim() || !draft.quantidade || !draft.valorUnitario) return;
    onChange([...value, { ...draft }]);
    setDraft({ talhaoId: "", nome: "", quantidade: "", unidade: "L", valorUnitario: "", valorTotal: "" });
    setEditIdx(null);
  }

  function atualizar(i: number, patch: Partial<Insumo>) {
    onChange(value.map((ins, idx) => (idx === i ? { ...ins, ...patch } : ins)));
  }

  function remover(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  function iniciarEdicao(i: number) {
    setEditIdx(i);
    setDraft({ ...value[i] });
  }

  function salvarEdicao() {
    if (!draft.nome.trim() || !draft.quantidade || !draft.valorUnitario) return;
    atualizar(editIdx!, { ...draft });
    setEditIdx(null);
    setDraft({ talhaoId: "", nome: "", quantidade: "", unidade: "L", valorUnitario: "", valorTotal: "" });
  }

  const total = value.reduce((s, i) => s + (Number(parseDecimal(i.valorTotal)) || 0), 0);

  return (
    <div className="rounded-[10px] border border-dashed border-line-strong bg-surface/60 p-4">
      <p className="text-xs text-ink-3">
        Adicione insumos. Cada item pode ser vinculado a um talhão específico (das porções)
        ou ficar sem talhão (fazenda inteira). Total é recalculado automaticamente.
      </p>

      {(editIdx === null ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_80px_80px_100px_100px_100px_auto] items-end">
          <Campo label="Nome" htmlFor={`${id}-nome`}>
            <input
              id={`${id}-nome`}
              className="field-input"
              value={draft.nome}
              onChange={(e) => setDraft({ ...draft, nome: e.target.value })}
              placeholder="Ex: Ureia, Herbicida X"
            />
          </Campo>
          {talhoesDisponiveis.length > 0 && (
            <Campo label="Talhão (opcional)" htmlFor={`${id}-talhao`}>
              <select
                id={`${id}-talhao`}
                className="field-input"
                value={draft.talhaoId}
                onChange={(e) => setDraft({ ...draft, talhaoId: e.target.value })}
              >
                <option value="">Fazenda inteira</option>
                {talhoesDisponiveis.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </Campo>
          )}
          <Campo label="Qtd" htmlFor={`${id}-qtd`}>
            <input
              id={`${id}-qtd`}
              className="field-input tnum"
              inputMode="decimal"
              value={draft.quantidade}
              onChange={(e) => { setDraft({ ...draft, quantidade: e.target.value }); recalcular(); }}
              placeholder="0"
            />
          </Campo>
          <Campo label="Unid" htmlFor={`${id}-unid`}>
            <select
              id={`${id}-unid`}
              className="field-input"
              value={draft.unidade}
              onChange={(e) => setDraft({ ...draft, unidade: e.target.value })}
            >
              {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Campo>
          <Campo label="Valor unit." htmlFor={`${id}-vu`}>
            <input
              id={`${id}-vu`}
              className="field-input tnum"
              inputMode="decimal"
              value={draft.valorUnitario}
              onChange={(e) => { setDraft({ ...draft, valorUnitario: e.target.value }); recalcular(); }}
              placeholder="0,00"
            />
          </Campo>
          <Campo label="Total" htmlFor={`${id}-vt`}>
            <input
              id={`${id}-vt`}
              className="field-input tnum"
              inputMode="decimal"
              value={draft.valorTotal}
              readOnly
            />
          </Campo>
          <button type="button" onClick={adicionar} className="btn btn-secondary h-10" disabled={!draft.nome.trim() || !draft.quantidade || !draft.valorUnitario}>
            <Plus className="size-4" /> Adicionar
          </button>
        </div>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_80px_80px_100px_100px_100px_auto] items-end">
          <Campo label="Nome" htmlFor={`${id}-nome-edit`}>
            <input
              id={`${id}-nome-edit`}
              className="field-input"
              value={draft.nome}
              onChange={(e) => setDraft({ ...draft, nome: e.target.value })}
            />
          </Campo>
          {talhoesDisponiveis.length > 0 && (
            <Campo label="Talhão" htmlFor={`${id}-talhao-edit`}>
              <select
                id={`${id}-talhao-edit`}
                className="field-input"
                value={draft.talhaoId}
                onChange={(e) => setDraft({ ...draft, talhaoId: e.target.value })}
              >
                <option value="">Fazenda inteira</option>
                {talhoesDisponiveis.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </Campo>
          )}
          <Campo label="Qtd" htmlFor={`${id}-qtd-edit`}>
            <input
              id={`${id}-qtd-edit`}
              className="field-input tnum"
              inputMode="decimal"
              value={draft.quantidade}
              onChange={(e) => { setDraft({ ...draft, quantidade: e.target.value }); recalcular(); }}
            />
          </Campo>
          <Campo label="Unid" htmlFor={`${id}-unid-edit`}>
            <select
              id={`${id}-unid-edit`}
              className="field-input"
              value={draft.unidade}
              onChange={(e) => setDraft({ ...draft, unidade: e.target.value })}
            >
              {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Campo>
          <Campo label="Valor unit." htmlFor={`${id}-vu-edit`}>
            <input
              id={`${id}-vu-edit`}
              className="field-input tnum"
              inputMode="decimal"
              value={draft.valorUnitario}
              onChange={(e) => { setDraft({ ...draft, valorUnitario: e.target.value }); recalcular(); }}
            />
          </Campo>
          <Campo label="Total" htmlFor={`${id}-vt-edit`}>
            <input
              id={`${id}-vt-edit`}
              className="field-input tnum"
              inputMode="decimal"
              value={draft.valorTotal}
              readOnly
            />
          </Campo>
          <div className="flex gap-1">
            <button type="button" onClick={salvarEdicao} className="btn btn-primary h-10" disabled={!draft.nome.trim() || !draft.quantidade || !draft.valorUnitario}>
              Salvar
            </button>
            <button type="button" onClick={() => { setEditIdx(null); setDraft({ talhaoId: "", nome: "", quantidade: "", unidade: "L", valorUnitario: "", valorTotal: "" }); }} className="btn btn-ghost h-10">Cancelar</button>
          </div>
        </div>
      ))}

      {value.length > 0 && (
        <>
          <p className="mt-2 text-sm font-medium text-ink-2">Insumos cadastrados</p>
          <ul className="mt-2 grid gap-2">
            {value.map((ins, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2">
                <span className="min-w-32 flex-1 text-sm font-medium text-ink">{ins.nome}</span>
                {ins.talhaoId && (
                  <span className="rounded-md bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-strong">
                    {talhoes.find((t) => t.id === ins.talhaoId)?.nome ?? "Talhão"}
                  </span>
                )}
                <span className="tnum text-sm text-ink-2">{ins.quantidade} {ins.unidade}</span>
                <span className="tnum text-sm text-ink-2">× {fmtMoney(Number(ins.valorUnitario))}</span>
                <span className="tnum text-sm font-semibold text-ink">{fmtMoney(Number(ins.valorTotal))}</span>
                {editIdx === i ? (
                  <>
                    <button type="button" onClick={salvarEdicao} className="btn btn-ghost text-xs" disabled={!draft.nome.trim() || !draft.quantidade || !draft.valorUnitario}>Salvar</button>
                    <button type="button" onClick={() => { setEditIdx(null); setDraft({ talhaoId: "", nome: "", quantidade: "", unidade: "L", valorUnitario: "", valorTotal: "" }); }} className="btn btn-ghost text-xs">Cancelar</button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => iniciarEdicao(i)} className="btn btn-ghost text-xs">Editar</button>
                    <button type="button" onClick={() => remover(i)} className="inline-flex size-8 items-center justify-center rounded-lg border border-line text-ink-3 transition-colors hover:border-danger-strong hover:text-danger-strong" aria-label={`Remover ${ins.nome}`}>
                      <Trash2 className="size-4" />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
          <div aria-live="polite" aria-atomic="true" className="mt-2">
            <p className="text-sm text-ink-2">Total insumos: <strong className="tnum text-ink">{fmtMoney(total)}</strong></p>
          </div>
        </>
      )}
    </div>
  );
}

export function insumosDeJson(bruto: unknown): Insumo[] {
  if (!Array.isArray(bruto)) return [];
  return bruto
    .filter(
      (i): i is Insumo =>
        !!i && typeof i === "object" && typeof (i as { nome?: unknown }).nome === "string",
    )
    .map((i) => ({
      talhaoId: i.talhaoId,
      nome: i.nome,
      quantidade: String(i.quantidade ?? "").replace(".", ","),
      unidade: i.unidade ?? "L",
      valorUnitario: String(i.valorUnitario ?? "").replace(".", ","),
      valorTotal: String(i.valorTotal ?? "").replace(".", ","),
    }));
}

export function insumosParaJson(insumos: Insumo[]): Insumo[] {
  return insumos.map((i) => ({
    ...i,
    quantidade: String(i.quantidade).replace(",", "."),
    valorUnitario: String(i.valorUnitario).replace(",", "."),
    valorTotal: String(i.valorTotal).replace(",", "."),
  }));
}