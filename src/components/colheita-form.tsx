"use client";

import { useEffect, useMemo, useState, useActionState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ActionState } from "@/lib/actions";
import { TIPOS_COLHEITA, type TipoColheita } from "@/lib/validators";
import {
  fmtMoney,
  fmtCount,
  parseDecimal,
  TAREFAS_POR_HA,
  toDateInputValue,
} from "@/lib/format";
import {
  calcularColheita,
  sacosAduboTarefa,
  MODELO_USINA_LABEL,
  type ModeloUsina,
} from "@/lib/colheita";
import { AlertaFormulario, BotaoSubmit, Campo } from "./forms";
import { CelulaMetrica } from "./stat-cells";
import { SelectorRegistro } from "./selector-registro";

export type FazendaOpcao = { id: string; nome: string; areaHa: number };
export type UsinaOpcao = { id: string; nome: string; modelo: string };
export type TalhaoOpcao = { id: string; nome: string; fazendaId: string; areaHa: number };

type Item = { nome: string; valor: string };

type Campos = {
  fazendaId: string;
  usinaId: string;
  data: string;
  tipo: string;
  safra: string;
  projecao: boolean;
  toneladas: string;
  precoCana: string;
  agio: string;
  atrPorTonelada: string;
  precoKgAtr: string;
  ctc: string;
  areaColhida: string;
  arrendar: boolean;
  tonsPorTarefa: string;
  tarefasArrendadas: string;
  adubo: boolean;
  precoTonAdubo: string;
  tarefasAdubo: string;
  observacao: string;
};

function n(v: string): number {
  const p = parseDecimal(v);
  return Number.isFinite(p) ? p : 0;
}

function opcional(v: string): number | null {
  return v.trim() === "" ? null : n(v);
}

function itensParaCalc(itens: Item[]): { nome: string; valor: number }[] {
  return itens
    .filter((i) => i.nome.trim() !== "" || i.valor.trim() !== "")
    .map((i) => ({ nome: i.nome, valor: n(i.valor) }));
}

function areaTarefas(areaHa: number): number {
  return Math.round(areaHa * 3.3 * 100) / 100;
}

function ListaItens({
  rotulo,
  dica,
  itens,
  onChange,
  nomeCampo,
}: {
  rotulo: string;
  dica: string;
  itens: Item[];
  onChange: (itens: Item[]) => void;
  nomeCampo: string;
}) {
  function setItem(idx: number, campo: keyof Item, valor: string) {
    onChange(itens.map((i, k) => (k === idx ? { ...i, [campo]: valor } : i)));
  }
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink">{rotulo}</p>
        <button
          type="button"
          onClick={() => onChange([...itens, { nome: "", valor: "" }])}
          className="text-sm font-semibold text-accent hover:text-accent-strong"
        >
          + Adicionar item
        </button>
      </div>
      <p className="-mt-2 text-xs text-ink-3">{dica}</p>
      <input type="hidden" name={nomeCampo} value={JSON.stringify(itens)} />
      {itens.map((item, idx) => (
        <div key={idx} className="flex items-start gap-2">
          <input
            className="field-input min-w-0 flex-1"
            value={item.nome}
            onChange={(e) => setItem(idx, "nome", e.target.value)}
            placeholder="Nome (ex.: Adubo foliar)"
            maxLength={60}
          />
          <input
            className="field-input tnum w-32"
            value={item.valor}
            onChange={(e) => setItem(idx, "valor", e.target.value)}
            inputMode="decimal"
            placeholder="Valor R$"
          />
          <button
            type="button"
            onClick={() => onChange(itens.filter((_, k) => k !== idx))}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-ink-3 transition-colors hover:border-danger-strong/25 hover:bg-danger-soft hover:text-danger-strong"
            aria-label="Remover item"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function ColheitaForm({
  acao,
  fazendas,
  usinas,
  talhoes = [],
  safras = [],
  inicial,
  modo = "criar",
  cancelarHref = "/colheitas",
}: {
  acao: (prev: ActionState | undefined, formData: FormData) => Promise<ActionState>;
  fazendas: FazendaOpcao[];
  usinas: UsinaOpcao[];
  talhoes?: TalhaoOpcao[];
  safras?: string[];
  inicial?: Partial<Campos> & {
    herbicidas?: Item[];
    insumos?: Item[];
    despesasUsina?: Item[];
    talhoesIds?: string[];
  };
  modo?: "criar" | "editar";
  cancelarHref?: string;
}) {
  const [state, acaoForm] = useActionState(acao, undefined);

  const fazendaSel =
    inicial?.fazendaId ?? (fazendas.length === 1 ? fazendas[0].id : "") ?? "";

  const tarefasFazendaSel = areaTarefas(
    fazendas.find((f) => f.id === fazendaSel)?.areaHa ?? 0,
  );
  const areaInicial =
    inicial?.areaColhida ?? (tarefasFazendaSel > 0 ? String(tarefasFazendaSel) : "");

  const [c, setC] = useState<Campos>(() => ({
    fazendaId: fazendaSel,
    usinaId: inicial?.usinaId ?? usinas[0]?.id ?? "",
    data: inicial?.data ?? toDateInputValue(new Date()),
    tipo: inicial?.tipo ?? "planta",
    safra: inicial?.safra ?? "",
    projecao: inicial?.projecao ?? false,
    toneladas: inicial?.toneladas ?? "",
    precoCana: inicial?.precoCana ?? "",
    agio: inicial?.agio ?? "",
    atrPorTonelada: inicial?.atrPorTonelada ?? "",
    precoKgAtr: inicial?.precoKgAtr ?? "",
    ctc: inicial?.ctc ?? "",
    areaColhida: areaInicial,
    arrendar: inicial?.arrendar ?? false,
    tonsPorTarefa: inicial?.tonsPorTarefa ?? "",
    tarefasArrendadas: inicial?.tarefasArrendadas ?? areaInicial,
    adubo: inicial?.adubo ?? false,
    precoTonAdubo: inicial?.precoTonAdubo ?? "",
    tarefasAdubo: inicial?.tarefasAdubo ?? areaInicial,
    observacao: inicial?.observacao ?? "",
  }));

  const [herbicidas, setHerbicidas] = useState<Item[]>(
    inicial?.herbicidas ?? [],
  );
  const [insumos, setInsumos] = useState<Item[]>(inicial?.insumos ?? []);
  const [despesasUsina, setDespesasUsina] = useState<Item[]>(
    inicial?.despesasUsina ?? [],
  );
  const [talhoesSel, setTalhoesSel] = useState<string[]>(
    (inicial?.talhoesIds as string[] | undefined) ?? [],
  );

  useEffect(() => {
    if (state && !state.ok) {
      toast.error(state.error);
    }
  }, [state]);

  const set = <K extends keyof Campos>(campo: K, valor: Campos[K]) =>
    setC((prev) => ({ ...prev, [campo]: valor }));

  const fazendaAtual = fazendas.find((f) => f.id === c.fazendaId);

  function trocarFazenda(id: string) {
    const f = fazendas.find((x) => x.id === id);
    const tarefas = areaTarefas(f?.areaHa ?? 0);
    const area = tarefas > 0 ? String(tarefas) : "";
    setC((prev) => ({
      ...prev,
      fazendaId: id,
      areaColhida: prev.areaColhida || area,
      tarefasArrendadas: prev.tarefasArrendadas || area,
      tarefasAdubo: prev.tarefasAdubo || area,
    }));
  }

  function trocarAreaColhida(valor: string) {
    setC((prev) => {
      const atual = prev.areaColhida;
      return {
        ...prev,
        areaColhida: valor,
        tarefasArrendadas:
          !prev.tarefasArrendadas || prev.tarefasArrendadas === atual
            ? valor
            : prev.tarefasArrendadas,
        tarefasAdubo:
          !prev.tarefasAdubo || prev.tarefasAdubo === atual
            ? valor
            : prev.tarefasAdubo,
      };
    });
  }

  function trocarUsina(id: string) {
    set("usinaId", id);
  }

  const modelo =
    (usinas.find((u) => u.id === c.usinaId)?.modelo ?? "pindorama") as ModeloUsina;
  const ehCoruripe = modelo === "coruripe";
  const sacos = sacosAduboTarefa(c.tipo);

  const resultado = useMemo(
    () =>
      calcularColheita({
        modelo,
        tipo: c.tipo,
        toneladas: n(c.toneladas),
        precoCana: opcional(c.precoCana),
        agio: opcional(c.agio),
        atrPorTonelada: opcional(c.atrPorTonelada),
        precoKgAtr: opcional(c.precoKgAtr),
        ctc: opcional(c.ctc) ?? 0,
        areaColhida: opcional(c.areaColhida),
        arrendar: c.arrendar,
        tonsPorTarefa: opcional(c.tonsPorTarefa),
        tarefasArrendadas: opcional(c.tarefasArrendadas),
        adubo: c.adubo,
        precoTonAdubo: opcional(c.precoTonAdubo),
        tarefasAdubo: opcional(c.tarefasAdubo) ?? undefined,
        herbicidas: itensParaCalc(herbicidas),
        insumos: itensParaCalc(insumos),
        despesasUsina: itensParaCalc(despesasUsina),
      }),
    [modelo, c, herbicidas, insumos, despesasUsina],
  );

  const linhasDespesas = [
    { r: "CTC", v: resultado.ctc },
    { r: "Arrendamento", v: resultado.arrendamento },
    { r: "Adubo", v: resultado.adubo },
    { r: "Herbicida", v: resultado.herbicida },
    { r: "Outros insumos", v: resultado.insumos },
    { r: "Despesas com a usina", v: resultado.despesasUsina },
  ].filter((x) => x.v > 0);

  const talhoesFazenda = c.fazendaId
    ? talhoes.filter((t) => t.fazendaId === c.fazendaId)
    : [];
  const talhoesColhidos = talhoesFazenda.filter((t) => talhoesSel.includes(t.id));
  const tarefasColhidas = talhoesColhidos.reduce((a, t) => a + t.areaHa * TAREFAS_POR_HA, 0);
  const rateio = talhoesColhidos.map((t) => {
    const tarefas = t.areaHa * TAREFAS_POR_HA;
    const prop = tarefasColhidas > 0 ? tarefas / tarefasColhidas : 0;
    return {
      nome: t.nome,
      tarefas,
      toneladas: n(c.toneladas) * prop,
      tHa: tarefas > 0 ? (n(c.toneladas) * prop) / tarefas : 0,
      receita: resultado.receita * prop,
    };
  });

  return (
    <form action={acaoForm} className="grid gap-6 pb-4">
      <AlertaFormulario mensagem={state && !state.ok ? state.error : undefined} />

      {/* Identificação */}
      <section className="ledger-panel grid gap-4 p-5 sm:p-6">
        <h2 className="font-display text-lg text-ink">Identificação</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            label="Fazenda"
            htmlFor="fazendaId"
            hint={fazendaAtual ? `${fazendaAtual.nome} · ${areaTarefas(fazendaAtual.areaHa)} tarefas` : undefined}
          >
            <select
              id="fazendaId"
              name="fazendaId"
              className="field-input"
              value={c.fazendaId}
              onChange={(e) => trocarFazenda(e.target.value)}
            >
              <option value="" disabled>
                Selecione a fazenda…
              </option>
              {fazendas.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Usina" htmlFor="usinaId">
            <select
              id="usinaId"
              name="usinaId"
              className="field-input"
              value={c.usinaId}
              onChange={(e) => trocarUsina(e.target.value)}
            >
              <option value="" disabled>
                Selecione a usina…
              </option>
              {usinas.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome} ({MODELO_USINA_LABEL[u.modelo as ModeloUsina]})
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Data da colheita" htmlFor="data">
            <input
              id="data"
              name="data"
              type="date"
              className="field-input"
              value={c.data}
              onChange={(e) => set("data", e.target.value)}
            />
          </Campo>

          <Campo label="Tipo de corte" htmlFor="tipo">
            <select
              id="tipo"
              name="tipo"
              className="field-input"
              value={c.tipo}
              onChange={(e) => set("tipo", e.target.value)}
            >
              {(Object.keys(TIPOS_COLHEITA) as TipoColheita[]).map((t) => (
                <option key={t} value={t}>
                  {TIPOS_COLHEITA[t]}
                </option>
              ))}
            </select>
          </Campo>

          <Campo
            label="Safra"
            htmlFor="safra"
            hint="Opcional. Digite ou escolha uma safra usada antes."
          >
            <input
              id="safra"
              name="safra"
              className="field-input"
              list="safras"
              value={c.safra}
              onChange={(e) => set("safra", e.target.value)}
              placeholder="Ex.: 2026/27"
              maxLength={30}
            />
            <datalist id="safras">
              {safras.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Campo>

          <div className="sm:col-span-2">
            <p className="field-label">Tipo de registro</p>
            <SelectorRegistro valor={c.projecao} onChange={(v) => set("projecao", v)} />
            <input type="hidden" name="projecao" value={c.projecao ? "on" : ""} />
          </div>
        </div>
      </section>

      {/* Produção e remuneração */}
      <section className="ledger-panel grid gap-4 p-5 sm:p-6">
        <h2 className="font-display text-lg text-ink">Produção e remuneração</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            label="Toneladas"
            htmlFor="toneladas"
            hint="Aceita vírgula. Ex.: 2.300"
          >
            <input
              id="toneladas"
              name="toneladas"
              className="field-input tnum"
              inputMode="decimal"
              value={c.toneladas}
              onChange={(e) => set("toneladas", e.target.value)}
              placeholder="Ex.: 2.300"
            />
          </Campo>

          <Campo
            label="Área colhida (tarefas)"
            htmlFor="areaColhida"
            hint={
              fazendaAtual
                ? `Fazenda: ${areaTarefas(fazendaAtual.areaHa)} tarefas — ajuste se não colheu tudo`
                : undefined
            }
          >
            <input
              id="areaColhida"
              name="areaColhida"
              className="field-input tnum"
              inputMode="decimal"
              value={c.areaColhida}
              onChange={(e) => trocarAreaColhida(e.target.value)}
              placeholder="Ex.: 200"
            />
          </Campo>

          {!ehCoruripe ? (
            <>
              <Campo label="Preço da cana (R$/t)" htmlFor="precoCana" hint="Sem o ágio.">
                <input
                  id="precoCana"
                  name="precoCana"
                  className="field-input tnum"
                  inputMode="decimal"
                  value={c.precoCana}
                  onChange={(e) => set("precoCana", e.target.value)}
                  placeholder="Ex.: 164,00"
                />
              </Campo>
              <Campo label="Ágio (R$/t)" htmlFor="agio">
                <input
                  id="agio"
                  name="agio"
                  className="field-input tnum"
                  inputMode="decimal"
                  value={c.agio}
                  onChange={(e) => set("agio", e.target.value)}
                  placeholder="Ex.: 15,00"
                />
              </Campo>
            </>
          ) : (
            <>
              <Campo label="ATR por tonelada" htmlFor="atrPorTonelada" hint="kg ATR/t — ex.: 125,496">
                <input
                  id="atrPorTonelada"
                  name="atrPorTonelada"
                  className="field-input tnum"
                  inputMode="decimal"
                  value={c.atrPorTonelada}
                  onChange={(e) => set("atrPorTonelada", e.target.value)}
                  placeholder="Ex.: 125,496"
                />
              </Campo>
              <Campo label="Preço do kg de ATR" htmlFor="precoKgAtr" hint="R$ por kg de ATR">
                <input
                  id="precoKgAtr"
                  name="precoKgAtr"
                  className="field-input tnum"
                  inputMode="decimal"
                  value={c.precoKgAtr}
                  onChange={(e) => set("precoKgAtr", e.target.value)}
                  placeholder="Ex.: 1,0852"
                />
              </Campo>
              <Campo
                label="Preço da cana (R$/t, opcional)"
                htmlFor="precoCana"
                hint="Usado só se não houver preço do kg de ATR."
              >
                <input
                  id="precoCana"
                  name="precoCana"
                  className="field-input tnum"
                  inputMode="decimal"
                  value={c.precoCana}
                  onChange={(e) => set("precoCana", e.target.value)}
                  placeholder="Ex.: 164,00"
                />
              </Campo>
            </>
          )}

          <Campo
            label="CTC — corte, carregamento e transporte (R$)"
            htmlFor="ctc"
            hint="Valor informado pela usina."
          >
            <input
              id="ctc"
              name="ctc"
              className="field-input tnum"
              inputMode="decimal"
              value={c.ctc}
              onChange={(e) => set("ctc", e.target.value)}
              placeholder="0,00"
            />
          </Campo>
        </div>
      </section>

      {/* Talhões colhidos */}
      <section className="ledger-panel grid gap-4 p-5 sm:p-6">
        <h2 className="font-display text-lg text-ink">Talhões colhidos</h2>
        <p className="text-xs text-ink-3">
          Marque os talhões que foram/serão colhidos. Toneladas e receita se repartem proporcional à
          área, para ter a produtividade (t/ha) media de cada talhão.
        </p>
        {c.fazendaId && talhoesFazenda.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-2">
              {talhoesFazenda.map((t) => (
                <label
                  key={t.id}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm transition-colors ${
                    talhoesSel.includes(t.id)
                      ? "border-accent bg-accent-soft text-ink"
                      : "border-line bg-surface text-ink-2"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--accent)]"
                    checked={talhoesSel.includes(t.id)}
                    onChange={() =>
                      setTalhoesSel(
                        talhoesSel.includes(t.id)
                          ? talhoesSel.filter((x) => x !== t.id)
                          : [...talhoesSel, t.id],
                      )
                    }
                  />
                  {t.nome}
                  <span className="text-xs text-ink-3">{fmtCount(Math.round(t.areaHa * TAREFAS_POR_HA))} tarefas</span>
                </label>
              ))}
            </div>
            <input type="hidden" name="talhoesIds" value={JSON.stringify(talhoesSel)} />
            {rateio.length > 0 && (
              <div className="overflow-x-auto rounded-[10px] border border-line bg-surface">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-3">
                      <th className="px-3 py-2 font-semibold">Talhão</th>
                      <th className="px-3 py-2 text-right font-semibold">Toneladas</th>
                      <th className="px-3 py-2 text-right font-semibold">t/ha</th>
                      <th className="px-3 py-2 text-right font-semibold">Receita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rateio.map((r) => (
                      <tr key={r.nome} className="border-b border-line">
                        <td className="px-3 py-2 font-medium text-ink">{r.nome}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-ink">{r.toneladas.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-ink">{r.tHa.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-ink">{fmtMoney(r.receita)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-ink-2">
            Selecione primeiro a fazenda para marcar os talhões colhidos.
          </p>
        )}
      </section>

      {/* Arrendamento */}
      <section className="ledger-panel grid gap-4 p-5 sm:p-6">
        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            name="arrendar"
            className="size-4 accent-[var(--accent)]"
            checked={c.arrendar}
            onChange={(e) => set("arrendar", e.target.checked)}
          />
          Pago arrendamento
        </label>
        {c.arrendar && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo
              label="Toneladas por tarefa arrendada"
              htmlFor="tonsPorTarefa"
              hint="Contrato de arrendamento."
            >
              <input
                id="tonsPorTarefa"
                name="tonsPorTarefa"
                className="field-input tnum"
                inputMode="decimal"
                value={c.tonsPorTarefa}
                onChange={(e) => set("tonsPorTarefa", e.target.value)}
                placeholder="Ex.: 40"
              />
            </Campo>
            <Campo
              label="Tarefas arrendadas"
              htmlFor="tarefasArrendadas"
              hint={c.areaColhida ? `Padrão: área colhida (${c.areaColhida})` : undefined}
            >
              <input
                id="tarefasArrendadas"
                name="tarefasArrendadas"
                className="field-input tnum"
                inputMode="decimal"
                value={c.tarefasArrendadas}
                onChange={(e) => set("tarefasArrendadas", e.target.value)}
                placeholder="Ex.: 100"
              />
            </Campo>
            <div className="flex items-end">
              <p className="w-full rounded-lg bg-surface-muted px-3 py-2.5 text-sm text-ink-2">
                Arrendamento:{" "}
                <span className="tnum font-semibold text-ink">
                  {fmtMoney(resultado.arrendamento)}
                </span>
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Adubo */}
      <section className="ledger-panel grid gap-4 p-5 sm:p-6">
        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            name="adubo"
            className="size-4 accent-[var(--accent)]"
            checked={c.adubo}
            onChange={(e) => set("adubo", e.target.checked)}
          />
          Comprei/paguei adubo
        </label>
        {c.adubo && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo
              label="Preço da tonelada de adubo"
              htmlFor="precoTonAdubo"
              hint="R$ por tonelada do adubo."
            >
              <input
                id="precoTonAdubo"
                name="precoTonAdubo"
                className="field-input tnum"
                inputMode="decimal"
                value={c.precoTonAdubo}
                onChange={(e) => set("precoTonAdubo", e.target.value)}
                placeholder="Ex.: 2.500"
              />
            </Campo>
            <Campo
              label="Área (tarefas)"
              htmlFor="tarefasAdubo"
              hint={c.areaColhida ? `Padrão: área colhida (${c.areaColhida})` : undefined}
            >
              <input
                id="tarefasAdubo"
                name="tarefasAdubo"
                className="field-input tnum"
                inputMode="decimal"
                value={c.tarefasAdubo}
                onChange={(e) => set("tarefasAdubo", e.target.value)}
                placeholder="Ex.: 100"
              />
            </Campo>
            <div className="flex items-end">
              <p className="w-full rounded-lg bg-surface-muted px-3 py-2.5 text-sm text-ink-2">
                {sacos} sacos/tarefa · {fmtMoney(resultado.adubo)}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Herbicida */}
      <section className="ledger-panel grid gap-4 p-5 sm:p-6">
        <ListaItens
          rotulo="Herbicida (calda)"
          dica="Adicione cada herbicida colocado na calda e o valor dele. Aplicado na área colhida."
          itens={herbicidas}
          onChange={setHerbicidas}
          nomeCampo="herbicidas"
        />
      </section>

      {/* Outros insumos */}
      <section className="ledger-panel grid gap-4 p-5 sm:p-6">
        <ListaItens
          rotulo="Outros insumos"
          dica="Calcário, pó de rocha, biológicos, vinhaça, indutores… Adicione quantos itens precisar."
          itens={insumos}
          onChange={setInsumos}
          nomeCampo="insumos"
        />
      </section>

      {/* Despesas com a usina */}
      <section className="ledger-panel grid gap-4 p-5 sm:p-6">
        <ListaItens
          rotulo="Despesas com a usina"
          dica="Adubo pago pela usina, herbicida devido, biológico, plantio… Adicione quantos itens precisar."
          itens={despesasUsina}
          onChange={setDespesasUsina}
          nomeCampo="despesasUsina"
        />
      </section>

      {/* Observações */}
      <section className="ledger-panel grid gap-4 p-5 sm:p-6">
        <Campo label="Observações" htmlFor="observacao">
          <textarea
            id="observacao"
            name="observacao"
            className="field-input min-h-24 resize-y"
            maxLength={300}
            value={c.observacao}
            onChange={(e) => set("observacao", e.target.value)}
            placeholder="Anotações sobre esta colheita…"
          />
        </Campo>
      </section>

      {/* Resultado */}
      <section className="grid gap-3">
        <h2 className="font-display text-lg text-ink">Resultado</h2>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-3">
          <CelulaMetrica rotulo="Receita" valor={fmtMoney(resultado.receita)} />
          <CelulaMetrica
            rotulo="Despesas"
            valor={fmtMoney(resultado.totalDespesas)}
          />
          <CelulaMetrica
            rotulo="Lucro bruto"
            valor={fmtMoney(resultado.lucro)}
            destaque
          />
        </div>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-3">
          <CelulaMetrica rotulo="Receita/t" valor={fmtMoney(resultado.receitaPorTonelada)} />
          <CelulaMetrica rotulo="Custo/t" valor={fmtMoney(resultado.custoPorTonelada)} />
          <CelulaMetrica
            rotulo="Lucro/t"
            valor={fmtMoney(resultado.lucroPorTonelada)}
            destaque
          />
        </div>
        {linhasDespesas.length > 0 && (
          <div className="ledger-panel grid gap-1 p-5">
            <p className="eyebrow text-ink-3">Composição das despesas</p>
            {linhasDespesas.map((x) => (
              <div
                key={x.r}
                className="flex items-baseline justify-between gap-4 py-1"
              >
                <dt className="text-sm text-ink-2">{x.r}</dt>
                <dd className="tnum text-sm font-semibold text-ink">{fmtMoney(x.v)}</dd>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-wrap justify-end gap-2">
        <Link href={cancelarHref} className="btn btn-ghost">
          Cancelar
        </Link>
        <BotaoSubmit>
          {modo === "editar" ? "Salvar alterações" : "Salvar colheita"}
        </BotaoSubmit>
      </div>
    </form>
  );
}