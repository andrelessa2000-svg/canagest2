"use client";

import { useEffect, useMemo, useState, useActionState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { ActionState } from "@/lib/actions";
import { TIPOS_COLHEITA, type TipoColheita } from "@/lib/validators";
import {
  fmtMoney,
  fmtTarefas,
  parseDecimal,
  TAREFAS_POR_HA,
  toDateInputValue,
} from "@/lib/format";
import { calcularColheita, MODELO_USINA_LABEL, type ModeloUsina } from "@/lib/colheita";
import { ESCOPOS_TRATO_LABEL } from "@/lib/validators";
import { AlertaFormulario, BotaoSubmit, Campo } from "./forms";
import { CampoSafra } from "./campo-safra";
import { CelulaMetrica } from "./stat-cells";
import { SelectorRegistro } from "./selector-registro";
import { SeletorPorcoes, alocacoesDeJson, alocacoesParaJson, type Alocacao } from "./seletor-porcoes";
import { EditorDespesas, despesasDeJson, despesasParaJson, type Despesa } from "./editor-despesas";

export type FazendaOpcao = {
  id: string;
  nome: string;
  areaHa: number;
  proprietarioId?: string | null;
};
export type UsinaOpcao = { id: string; nome: string; modelo: string };
export type TalhaoOpcao = { id: string; nome: string; fazendaId: string; areaHa: number };

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
  escopo: string;
  arrendar: boolean;
  tonsPorTarefa: string;
  tarefasArrendadas: string;
  observacao: string;
  dividas?: Despesa[];
};

function n(v: string): number {
  const p = parseDecimal(v);
  return Number.isFinite(p) ? p : 0;
}

function opcional(v: string): number | null {
  return v.trim() === "" ? null : n(v);
}

function areaTarefas(areaHa: number): number {
  return Math.round(areaHa * 3.3 * 100) / 100;
}

export function ColheitaForm({
  acao,
  fazendas,
  usinas,
  talhoes = [],
  safras = [],
  proprietarios = [],
  inicial,
  modo = "criar",
  cancelarHref = "/colheitas",
}: {
  acao: (prev: ActionState | undefined, formData: FormData) => Promise<ActionState>;
  fazendas: FazendaOpcao[];
  usinas: UsinaOpcao[];
  talhoes?: TalhaoOpcao[];
  safras?: string[];
  proprietarios?: { id: string; nome: string }[];
  inicial?: Partial<Campos> & {
    talhaoId?: string | null;
    talhoesIds?: unknown;
    alocacoes?: unknown;
  };
  modo?: "criar" | "editar";
  cancelarHref?: string;
}) {
  const [state, acaoForm] = useActionState(acao, undefined);
  // Escopo por proprietário: dono escolhido e fazendas marcadas (undefined = todas).
  const [donoId, setDonoId] = useState("");
  const [fazendasSel, setFazendasSel] = useState<string[] | undefined>(undefined);

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
    escopo: inicial?.escopo ?? "fazenda",
    arrendar: inicial?.arrendar ?? false,
    tonsPorTarefa: inicial?.tonsPorTarefa ?? "",
    tarefasArrendadas: inicial?.tarefasArrendadas ?? areaInicial,
    observacao: inicial?.observacao ?? "",
  }));

  const [dividas, setDividas] = useState<Despesa[]>(
    inicial?.dividas ? despesasDeJson(inicial.dividas) : [],
  );
  const [porcoes, setPorcoes] = useState<Alocacao[]>(
    inicial?.alocacoes ? alocacoesDeJson(inicial.alocacoes) : [],
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
    }));
    setPorcoes([]);
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
      };
    });
  }

  function trocarUsina(id: string) {
    set("usinaId", id);
  }

  const modelo =
    (usinas.find((u) => u.id === c.usinaId)?.modelo ?? "pindorama") as ModeloUsina;
  const ehCoruripe = modelo === "coruripe";

  const talhoesFazenda = c.fazendaId
    ? talhoes.filter((t) => t.fazendaId === c.fazendaId)
    : [];

  // Escopo por proprietário: fazendas do dono com área em tarefas.
  const escopoDono = c.escopo === "proprietario" && proprietarios.length > 0;
  const fazendasDoDono =
    escopoDono && donoId
      ? fazendas.filter((f) => f.proprietarioId === donoId)
      : [];
  const fazendasEscolhidas =
    escopoDono && donoId
      ? fazendasDoDono.filter(
          (f) => fazendasSel === undefined || fazendasSel.includes(f.id),
        )
      : [];
  const totalDonoTarefas =
    Math.round(
      fazendasEscolhidas.reduce((a, f) => a + areaTarefas(f.areaHa), 0) * 100,
    ) / 100;

  // Escopo "fazenda" cobre todos os talhões; nos demais, usa as porções escolhidas.
  const { alocacoes, talhoesIds, tarefasTotais } = alocacoesParaJson(
    porcoes,
    talhoesFazenda,
  );
  const tarefasColhidas =
    escopoDono
      ? totalDonoTarefas
      : c.escopo === "fazenda"
        ? areaTarefas(fazendas.find((f) => f.id === c.fazendaId)?.areaHa ?? 0)
        : tarefasTotais;

  // Em escopos de talhão/parte la "área colhida" proviene de las porciones;
  // em "fazenda" el usuario puede ajustarla manualmente; por dono ela é a soma das fazendas.
  const areaColhidaValor =
    escopoDono
      ? totalDonoTarefas > 0 ? String(totalDonoTarefas) : ""
      : c.escopo === "fazenda" ? c.areaColhida : tarefasColhidas > 0 ? String(tarefasColhidas) : "";

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
        arrendar: c.arrendar,
        tonsPorTarefa: opcional(c.tonsPorTarefa),
        tarefasArrendadas:
          escopoDono && totalDonoTarefas > 0 ? totalDonoTarefas : opcional(c.tarefasArrendadas),
        dividas: dividas.map((d) => ({ nome: d.nome, valor: Number(parseDecimal(d.valor)) || 0 })),
      }),
    [modelo, c, dividas, escopoDono, totalDonoTarefas],
  );

  const linhasDespesas = [
    { r: "CTC", v: resultado.ctc },
    { r: "Arrendamento", v: resultado.arrendamento },
    { r: "Dívidas com usina ou terceiros", v: resultado.dividas },
  ].filter((x) => x.v > 0);

  const rateio = talhoesFazenda.map((t) => {
    const tarefasTalhao = c.escopo === "fazenda" ? t.areaHa * TAREFAS_POR_HA : (alocacoes.find((a) => a.talhaoId === t.id)?.tarefas ?? 0);
    const prop = tarefasColhidas > 0 ? tarefasTalhao / tarefasColhidas : 0;
    return {
      nome: t.nome,
      areaColhida: tarefasTalhao / TAREFAS_POR_HA,
      toneladas: n(c.toneladas) * prop,
      tHa: t.areaHa > 0 ? (n(c.toneladas) * prop) / t.areaHa : 0,
      receita: resultado.receita * prop,
    };
  }).filter((r) => r.areaColhida > 0);

  // Rateio entre as fazendas do dono (escopo "proprietario").
  const rateioDono = fazendasEscolhidas.map((f) => {
    const tarefas = areaTarefas(f.areaHa);
    const prop = totalDonoTarefas > 0 ? tarefas / totalDonoTarefas : 0;
    return {
      id: f.id,
      nome: f.nome,
      tarefas,
      share: prop,
      toneladas: n(c.toneladas) * prop,
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
          {escopoDono ? (
            <>
              <Campo
                label="Proprietário (dono)"
                htmlFor="donoId"
                hint="A colheita vale para as fazendas dele que você marcar abaixo; o app grava um registro por fazenda."
              >
                <select
                  id="donoId"
                  name="donoId"
                  className="field-input"
                  value={donoId}
                  onChange={(e) => {
                    setDonoId(e.target.value);
                    setFazendasSel(undefined);
                  }}
                >
                  <option value="" disabled>
                    Selecione…
                  </option>
                  {proprietarios.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo
                label="Fazendas a colher"
                htmlFor="fazendasDono"
                hint={
                  donoId && fazendasDoDono.length === 0
                    ? "Este dono não tem fazendas cadastradas."
                    : `${fazendasEscolhidas.length} de ${fazendasDoDono.length} fazendas marcadas · ${String(totalDonoTarefas).replace(".", ",")} tarefas`
                }
              >
                <div
                  id="fazendasDono"
                  className="max-h-44 overflow-y-auto rounded-[10px] border border-line bg-surface px-3 py-2"
                >
                  {fazendasDoDono.length === 0 ? (
                    <p className="text-xs text-ink-3">
                      {donoId
                        ? "Cadastre fazendas para este dono primeiro."
                        : "Escolha o dono para listar as fazendas."}
                    </p>
                  ) : (
                    <ul className="grid gap-1">
                      <li>
                        <label className="flex items-center gap-2 text-xs font-semibold text-ink-2">
                          <input
                            type="checkbox"
                            className="size-4 accent-[var(--accent)]"
                            checked={fazendasSel === undefined || fazendasSel.length === fazendasDoDono.length}
                            onChange={(e) =>
                              setFazendasSel(e.target.checked ? undefined : [])
                            }
                          />
                          Todas as fazendas
                        </label>
                      </li>
                      {fazendasDoDono.map((f) => (
                        <li key={f.id}>
                          <label className="flex items-center gap-2 text-sm text-ink">
                            <input
                              type="checkbox"
                              className="size-4 accent-[var(--accent)]"
                              checked={fazendasSel === undefined || fazendasSel.includes(f.id)}
                              onChange={(e) => {
                                const atual = fazendasSel ?? fazendasDoDono.map((x) => x.id);
                                setFazendasSel(
                                  e.target.checked
                                    ? [...atual, f.id]
                                    : atual.filter((x) => x !== f.id),
                                );
                              }}
                            />
                            <span className="truncate">{f.nome}</span>
                            <span className="ml-auto shrink-0 text-xs text-ink-3 tnum">
                              {String(areaTarefas(f.areaHa)).replace(".", ",")} tarefas
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Campo>
            </>
          ) : (
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
                  Selecione a fazenda⬦
                </option>
                {fazendas.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </Campo>
          )}

          <Campo label="Usina" htmlFor="usinaId">
            <select
              id="usinaId"
              name="usinaId"
              className="field-input"
              value={c.usinaId}
              onChange={(e) => trocarUsina(e.target.value)}
            >
              <option value="" disabled>
                Selecione a usina⬦
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

          <CampoSafra defaultValue={c.safra} usadas={safras} id="safra-colheita" />

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
                ? `Fazenda: ${areaTarefas(fazendaAtual.areaHa)} tarefas � ajuste se não colheu tudo`
                : undefined
            }
          >
            <input
              id="areaColhida"
              name="areaColhida"
              className="field-input tnum"
              inputMode="decimal"
              value={areaColhidaValor}
              readOnly={c.escopo !== "fazenda"}
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
              <Campo label="ATR por tonelada" htmlFor="atrPorTonelada" hint="kg ATR/t � ex.: 125,496">
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
            label="CTC � corte, carregamento e transporte (R$)"
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

      {/* Escopo e talhões colhidos */}
      <section className="ledger-panel grid gap-4 p-5 sm:p-6">
        <h2 className="font-display text-lg text-ink">Escopo da colheita</h2>
        <Campo label="Abrangência" htmlFor="escopo">
          <select
            id="escopo"
            name="escopo"
            className="field-input"
            value={c.escopo}
            onChange={(e) => {
              set("escopo", e.target.value);
              setFazendasSel(undefined);
            }}
          >
            {Object.entries(ESCOPOS_TRATO_LABEL)
              .filter(([v]) => v !== "proprietario" || proprietarios.length > 0)
              .map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
          </select>
        </Campo>

        {escopoDono && (
          <>
            <input type="hidden" name="fazendaId" value={fazendasEscolhidas[0]?.id ?? ""} />
            <input
              type="hidden"
              name="fazendasIds"
              value={JSON.stringify(fazendasEscolhidas.map((f) => f.id))}
            />
          </>
        )}

        {escopoDono && donoId ? (
          <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-ink-2">
            {fazendasEscolhidas.length} fazendas de {donoId ? (proprietarios.find((p) => p.id === donoId)?.nome ?? "dono") : ""} · {String(totalDonoTarefas).replace(".", ",")} tarefas — registro por fazenda, com toneladas, área e valores rateados proporcionalmente.
          </p>
        ) : c.escopo === "fazenda" && fazendaAtual ? (
          <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-ink-2">
            {fazendaAtual.nome} · {fmtTarefas(fazendaAtual.areaHa)} — registro em toda a fazenda
          </p>
        ) : !escopoDono ? (
          <>
            <p className="text-xs text-ink-3">
              Pode marcar <strong>vários talhões</strong> de uma vez: talhões inteiros, partes de
              outros, ou uma mistura de ambos. As toneladas e a receita se repartem proporcional
              às tarefas de cada talhão.
            </p>
            {talhoesFazenda.length === 0 ? (
              <p className="text-sm text-ink-2">Selecione primeiro a fazenda.</p>
            ) : (
              <SeletorPorcoes
                id="porcoes-colheita"
                talhoes={talhoesFazenda}
                value={porcoes}
                onChange={setPorcoes}
              />
            )}
          </>
        ) : null}

        <input type="hidden" name="alocacoes" value={JSON.stringify(alocacoes)} />
        <input type="hidden" name="talhoesIds" value={JSON.stringify(talhoesIds)} />

        {escopoDono && rateioDono.length > 0 && (
          <div className="overflow-x-auto rounded-[10px] border border-line bg-surface">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-3">
                  <th className="px-3 py-2 font-semibold">Fazenda</th>
                  <th className="px-3 py-2 text-right font-semibold">Tarefas</th>
                  <th className="px-3 py-2 text-right font-semibold">Rateio</th>
                  <th className="px-3 py-2 text-right font-semibold">Toneladas</th>
                  <th className="px-3 py-2 text-right font-semibold">Receita</th>
                </tr>
              </thead>
              <tbody>
                {rateioDono.map((r) => (
                  <tr key={r.id} className="border-b border-line">
                    <td className="px-3 py-2 font-medium text-ink">{r.nome}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink">
                      {String(r.tarefas).replace(".", ",")}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink">
                      {(r.share * 100).toFixed(1).replace(".", ",")}%
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink">
                      {r.toneladas.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink">
                      {fmtMoney(r.receita)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!escopoDono && rateio.length > 0 && (
          <div className="overflow-x-auto rounded-[10px] border border-line bg-surface">
            <table className="w-full min-w-[460px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-3">
                  <th className="px-3 py-2 font-semibold">Talhão</th>
                  <th className="px-3 py-2 text-right font-semibold">Área colhida (ha)</th>
                  <th className="px-3 py-2 text-right font-semibold">Toneladas</th>
                  <th className="px-3 py-2 text-right font-semibold">t/ha</th>
                  <th className="px-3 py-2 text-right font-semibold">Receita</th>
                </tr>
              </thead>
              <tbody>
                {rateio.map((r) => (
                  <tr key={r.nome} className="border-b border-line">
                    <td className="px-3 py-2 font-medium text-ink">{r.nome}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink">
                      {r.areaColhida.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink">
                      {r.toneladas.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink">
                      {r.tHa.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink">
                      {fmtMoney(r.receita)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
              hint={
                escopoDono
                  ? `Rateado entre as fazendas do dono (total: ${String(totalDonoTarefas).replace(".", ",")})`
                  : c.areaColhida
                    ? `Padrão: área colhida (${c.areaColhida})`
                    : undefined
              }
            >
              <input
                id="tarefasArrendadas"
                name="tarefasArrendadas"
                className="field-input tnum"
                inputMode="decimal"
                value={escopoDono ? (totalDonoTarefas > 0 ? String(totalDonoTarefas) : "") : c.tarefasArrendadas}
                readOnly={escopoDono}
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

      {/* Despesas livres */}
      <section className="ledger-panel grid gap-4 p-5 sm:p-6">
        <h2 className="font-display text-lg text-ink">Despesas com a usina ou terceiros</h2>
        <EditorDespesas
          id="dividas-colheita"
          value={dividas}
          onChange={setDividas}
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
            placeholder="Anotações sobre esta colheita⬦"
          />
        </Campo>
      </section>

      <input type="hidden" name="dividas" value={JSON.stringify(despesasParaJson(dividas))} />

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

