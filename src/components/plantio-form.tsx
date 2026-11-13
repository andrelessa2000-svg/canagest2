"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import type { ActionState } from "@/lib/actions";
import { ESCOPOS_TRATO_LABEL, TIPOS_PLANTIO_LABEL } from "@/lib/validators";
import { fmtCount, fmtMoney, fmtTarefas, haParaTarefas, parseDecimal, toDateInputValue } from "@/lib/format";
import { AlertaFormulario, BotaoSubmit, Campo } from "./forms";
import { CampoSafra } from "./campo-safra";
import { SelectorRegistro } from "./selector-registro";
import { SeletorInsumos, insumosDeJson, insumosParaJson, type Insumo } from "./seletor-insumos";
import {
  SeletorPorcoes,
  alocacoesDeJson,
  alocacoesParaJson,
  type Alocacao,
} from "./seletor-porcoes";
import { ResumoPorDono, type LinhaResumoDono } from "./resumo-por-dono";

function num(v: string): number {
  const p = parseDecimal(v);
  return Number.isFinite(p) ? p : 0;
}

const TIPOS_MAQUINA = ["dia", "mes", "hora", "tarefa", "ha"] as const;
const TIPOS_MAQUINA_LABEL: Record<string, string> = {
  dia: "por dia",
  mes: "por mês",
  hora: "por hora",
  tarefa: "por tarefa",
  ha: "por ha",
};

type Operacao = { nome: string; maquinaValor: string; maquinaTipo: string; maquinaQtd: string; maodeobra: string; insumo: string };

export type FazendaOpcao = {
  id: string;
  nome: string;
  areaHa: number;
  proprietarioNome?: string | null;
};
export type TalhaoOpcao = { id: string; nome: string; fazendaId: string; areaHa: number };

type Inicial = {
  fazendaId?: string;
  talhaoId?: string;
  talhoesIds?: string[];
  alocacoes?: unknown;
  insumos?: unknown;
  escopo?: string;
  tarefas?: string;
  safra?: string;
  tipo?: string;
  data?: string;
  valor?: string;
  projecao?: boolean;
  areaHa?: string;
  observacao?: string;
};

export function PlantioForm({
  acao,
  fazendas,
  talhoes,
  safras,
  inicial,
}: {
  acao: (prev: ActionState | undefined, formData: FormData) => Promise<ActionState>;
  fazendas: FazendaOpcao[];
  talhoes: TalhaoOpcao[];
  safras: string[];
  inicial?: Inicial;
}) {
  const [state, action] = useActionState(acao, undefined);
  const [fazendaId, setFazendaId] = useState(inicial?.fazendaId ?? "");
  const [escopo, setEscopo] = useState(inicial?.escopo ?? "fazenda");
  // undefined = todas as fazendas marcadas; array = seleção explícita.
  const [fazendasSel, setFazendasSel] = useState<string[] | undefined>(undefined);
  const [porcoes, setPorcoes] = useState<Alocacao[]>(
    inicial?.alocacoes
      ? alocacoesDeJson(inicial.alocacoes)
      : (inicial?.talhoesIds ?? []).map((id) => ({
          talhaoId: id,
          tarefas: inicial?.tarefas && inicial.talhoesIds?.length === 1 ? inicial.tarefas : "",
          completo: inicial?.escopo !== "parte",
        })),
  );
  const [projecao, setProjecao] = useState(inicial?.projecao ?? false);
  const [insumos, setInsumos] = useState<Insumo[]>(inicial?.insumos ? insumosDeJson(inicial.insumos) : []);
  const [valor, setValor] = useState(inicial?.valor ?? "");
  const [calculadora, setCalculadora] = useState(false);

  const [maquinaTipo, setMaquinaTipo] = useState<string>("dia");
  const [maquinaValor, setMaquinaValor] = useState("");
  const [maquinaQtd, setMaquinaQtd] = useState("");

  const [operacoes, setOperacoes] = useState<Operacao[]>([]);

  const totalMaquina = num(maquinaValor) * num(maquinaQtd);
  const totalOperacoes = operacoes.reduce(
    (a, o) =>
      a + num(o.maquinaValor) * num(o.maquinaQtd) + num(o.maodeobra) + num(o.insumo),
    0,
  );
  const totalPlantio = totalMaquina + totalOperacoes;

  // Base do rateio: valor digitado, senão o total da calculadora.
  const totalBase = num(valor) > 0 ? num(valor) : totalPlantio;

  function setOperacao(idx: number, campo: keyof Operacao, v: string) {
    setOperacoes(operacoes.map((o, k) => (k === idx ? { ...o, [campo]: v } : o)));
  }

  const talhoesFazenda = fazendaId
    ? talhoes.filter((t) => t.fazendaId === fazendaId)
    : [];
  const fazendaAtual = fazendas.find((f) => f.id === fazendaId);

  const { alocacoes, talhoesIds, tarefasTotais } = alocacoesParaJson(porcoes, talhoesFazenda);
  const escopoTalhoes = escopo === "talhao" || escopo === "parte";
  const escopoDono =
    escopo === "proprietario" && fazendas.some((f) => f.proprietarioNome);

  // Escopo por donos: todas as fazendas listadas agrupadas pelo dono; rateio pela área de cada uma.
  const tarefasFazenda = (f: FazendaOpcao) =>
    Math.round(haParaTarefas(f.areaHa) * 100) / 100;
  const fazendasEscolhidas = escopoDono
    ? fazendas.filter(
        (f) => fazendasSel === undefined || fazendasSel.includes(f.id),
      )
    : [];
  const totalDonoTarefas =
    Math.round(
      fazendasEscolhidas.reduce((a, f) => a + tarefasFazenda(f), 0) * 100,
    ) / 100;
  const gruposDono = (escopoDono ? fazendas : []).reduce<
    { dono: string; fazendas: FazendaOpcao[] }[]
  >((acc, f) => {
    const dono = f.proprietarioNome ?? "Sem dono";
    const g = acc.find((x) => x.dono === dono);
    if (g) g.fazendas.push(f);
    else acc.push({ dono, fazendas: [f] });
    return acc;
  }, []);

  function toggleFazenda(id: string, marcado: boolean) {
    const base = fazendasSel ?? fazendas.map((f) => f.id);
    setFazendasSel(
      marcado ? [...new Set([...base, id])] : base.filter((x) => x !== id),
    );
  }

  function toggleGrupo(dono: string, marcado: boolean) {
    const grupo = gruposDono.find((g) => g.dono === dono);
    if (!grupo) return;
    const ids = grupo.fazendas.map((f) => f.id);
    const base = fazendasSel ?? fazendas.map((f) => f.id);
    setFazendasSel(
      marcado
        ? [...new Set([...base, ...ids])]
        : base.filter((x) => !ids.includes(x)),
    );
  }

  // Resumo por dono: área, insumos e valor de cada proprietário no rateio.
  const resumoDono: LinhaResumoDono[] = escopoDono
    ? gruposDono
        .map((g) => {
          const escolhidas = g.fazendas.filter(
            (f) => fazendasSel === undefined || fazendasSel.includes(f.id),
          );
          const tarefas =
            Math.round(escolhidas.reduce((a, f) => a + tarefasFazenda(f), 0) * 100) / 100;
          const share = totalDonoTarefas > 0 ? tarefas / totalDonoTarefas : 0;
          const itens = insumos
            .filter((i) => num(i.quantidade) > 0)
            .map(
              (i) =>
                `${fmtCount(num(i.quantidade) * share)} ${i.unidade} · ${i.nome || "insumo"}`,
            );
          return {
            dono: g.dono,
            tarefas,
            valor: totalBase * share,
            detalhes: itens.length > 0 ? itens.join(" · ") : undefined,
          };
        })
        .filter((x) => x.tarefas > 0)
    : [];

  return (
    <form action={action} className="grid gap-5 pb-4">
      <AlertaFormulario mensagem={state && !state.ok ? state.error : undefined} />

      <div className="grid gap-4 sm:grid-cols-2">
        {escopoDono ? (
          <div className="sm:col-span-2">
            <Campo
              label="Fazendas a plantar (por dono)"
              htmlFor="fazendasDono"
              hint={`${fazendasEscolhidas.length} de ${fazendas.length} fazendas marcadas · ${String(totalDonoTarefas).replace(".", ",")} tarefas · o app grava um registro por fazenda, rateando pela área`}
            >
              <div
                id="fazendasDono"
                className="max-h-72 overflow-y-auto rounded-[10px] border border-line bg-surface px-3 py-2"
              >
                {gruposDono.length === 0 ? (
                  <p className="text-xs text-ink-3">
                    Nenhuma fazenda com dono cadastrado. Vincule as fazendas na página Proprietários.
                  </p>
                ) : (
                  <ul className="grid gap-2">
                    <li>
                      <label className="flex items-center gap-2 text-xs font-semibold text-ink-2">
                        <input
                          type="checkbox"
                          className="size-4 accent-[var(--accent)]"
                          checked={fazendasSel === undefined || fazendasSel.length === fazendas.length}
                          onChange={(e) => setFazendasSel(e.target.checked ? undefined : [])}
                        />
                        Todas as fazendas
                      </label>
                    </li>
                    {gruposDono.map((g) => (
                      <li key={g.dono} className="rounded-lg bg-surface-muted px-2 py-1.5">
                        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-2">
                          <input
                            type="checkbox"
                            className="size-4 accent-[var(--accent)]"
                            checked={
                              fazendasSel === undefined ||
                              g.fazendas.every((f) => fazendasSel.includes(f.id))
                            }
                            onChange={(e) => toggleGrupo(g.dono, e.target.checked)}
                          />
                          {g.dono}
                          <span className="ml-auto shrink-0 font-semibold tnum">
                            {String(
                              Math.round(g.fazendas.reduce((a, f) => a + tarefasFazenda(f), 0) * 100) / 100,
                            ).replace(".", ",")} tarefas
                          </span>
                        </label>
                        <ul className="mt-1 grid gap-1">
                          {g.fazendas.map((f) => (
                            <li key={f.id}>
                              <label className="flex items-center gap-2 text-sm text-ink">
                                <input
                                  type="checkbox"
                                  className="size-4 accent-[var(--accent)]"
                                  checked={fazendasSel === undefined || fazendasSel.includes(f.id)}
                                  onChange={(e) => toggleFazenda(f.id, e.target.checked)}
                                />
                                <span className="truncate">{f.nome}</span>
                                <span className="ml-auto shrink-0 text-xs text-ink-3 tnum">
                                  {String(tarefasFazenda(f)).replace(".", ",")} tarefas
                                </span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Campo>
          </div>
        ) : (
          <Campo label="Fazenda" htmlFor="fazendaId">
            <select
              id="fazendaId"
              name="fazendaId"
              className="field-input"
              required
              value={fazendaId}
                onChange={(e) => {
                setFazendaId(e.target.value);
                setPorcoes([]);
              }}
            >
              <option value="" disabled>
                Selecione…
              </option>
              {fazendas.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </Campo>
        )}

        <Campo
          label="Escopo"
          htmlFor="escopo"
          hint="Fazenda inteira, talhões específicos, parte de um talhão ou fazendas de vários donos."
        >
          <select
            id="escopo"
            name="escopo"
            className="field-input"
            value={escopo}
            onChange={(e) => {
              setEscopo(e.target.value);
              setFazendasSel(undefined);
            }}
          >
            {Object.entries(ESCOPOS_TRATO_LABEL)
              .filter(([v]) => v !== "proprietario" || fazendas.some((f) => f.proprietarioNome))
              .map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
          </select>
        </Campo>
      </div>

      {(escopo === "talhao" || escopo === "parte") && (
        <div className="grid gap-3">
          <p className="text-sm font-medium text-ink-2">
            {escopo === "talhao"
              ? "Talhões do plantio:"
              : "Parte do talhão onde se planta:"}
          </p>
          {talhoesFazenda.length === 0 ? (
            <p className="text-sm text-ink-2">Selecione primeiro a fazenda.</p>
          ) : (
            <SeletorPorcoes
              id="porcoes-plantio"
              talhoes={talhoesFazenda}
              value={porcoes}
              onChange={setPorcoes}
            />
          )}
        </div>
      )}

      {escopo === "fazenda" && fazendaAtual && (
        <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-ink-2">
          {fazendaAtual.nome} · {fmtTarefas(fazendaAtual.areaHa)} — registro em toda a fazenda
        </p>
      )}

      <input type="hidden" name="alocacoes" value={JSON.stringify(alocacoes)} />
      <input type="hidden" name="talhoesIds" value={JSON.stringify(talhoesIds)} />
      <input type="hidden" name="insumos" value={JSON.stringify(insumosParaJson(insumos))} />
      <input
        type="hidden"
        name="fazendasIds"
        value={escopoDono ? JSON.stringify(fazendasEscolhidas.map((f) => f.id)) : "[]"}
      />
      {escopoDono && (
        <input type="hidden" name="fazendaId" value={fazendasEscolhidas[0]?.id ?? ""} />
      )}
      <input
        type="hidden"
        name="tarefas"
        value={escopoDono ? "" : escopoTalhoes ? String(tarefasTotais) : (inicial?.tarefas ?? "")}
      />
      {escopoDono && <input type="hidden" name="areaHa" value="" />}

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoSafra defaultValue={inicial?.safra} usadas={safras} id="safra-plantio" />

        <Campo label="Tipo" htmlFor="tipo">
          <select id="tipo" name="tipo" className="field-input" defaultValue={inicial?.tipo ?? "planta"}>
            {Object.entries(TIPOS_PLANTIO_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Data" htmlFor="data">
          <input
            id="data"
            name="data"
            type="date"
            className="field-input"
            defaultValue={inicial?.data ?? toDateInputValue(new Date())}
          />
        </Campo>

        <Campo label="Valor (R$)" htmlFor="valor" hint="Digite o valor ou use Calcular.">
          <input
            id="valor"
            name="valor"
            className="field-input tnum"
            inputMode="decimal"
            required
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
          />
        </Campo>

        <div className="sm:col-span-2">
          <button
            type="button"
            onClick={() => setCalculadora(!calculadora)}
            className="text-sm font-semibold text-accent hover:text-accent-strong"
          >
            {calculadora ? "Ocultar calculadora" : "+ Calcular custo do plantio"}
          </button>
        </div>

        {calculadora && (
          <div className="rounded-[10px] border border-dashed border-line-strong bg-surface/60 p-4 sm:col-span-2">
            <p className="text-xs text-ink-3">
              Maquinário por dia/mês/hora/tarefa/ha + etapas do plantio (preparo, corte de semente,
              espalhar, adubar, cobrir, herbicida…), cada uma com máquina, mão de obra e insumo.
            </p>

            <p className="mt-4 text-sm font-medium text-ink">Maquinário</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              <Campo label="Tipo de pagamento" htmlFor="maqTipo">
                <select
                  id="maqTipo"
                  className="field-input"
                  value={maquinaTipo}
                  onChange={(e) => setMaquinaTipo(e.target.value)}
                >
                  {TIPOS_MAQUINA.map((m) => (
                    <option key={m} value={m}>
                      {TIPOS_MAQUINA_LABEL[m]}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Valor (R$)" htmlFor="maqValor">
                <input
                  id="maqValor"
                  className="field-input tnum"
                  inputMode="decimal"
                  value={maquinaValor}
                  onChange={(e) => setMaquinaValor(e.target.value)}
                />
              </Campo>
              <Campo label="Quantidade" htmlFor="maqQtd" hint={`dias, horas, ${maquinaTipo}…`}>
                <input
                  id="maqQtd"
                  className="field-input tnum"
                  inputMode="decimal"
                  value={maquinaQtd}
                  onChange={(e) => setMaquinaQtd(e.target.value)}
                />
              </Campo>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm font-medium text-ink">Etapas do plantio</p>
              <button
                type="button"
                onClick={() =>
                  setOperacoes([
                    ...operacoes,
                    { nome: "", maquinaValor: "", maquinaTipo: "ha", maquinaQtd: "", maodeobra: "", insumo: "" },
                  ])
                }
                className="text-sm font-semibold text-accent hover:text-accent-strong"
              >
                + Adicionar etapa
              </button>
            </div>
            <div className="mt-2 grid gap-2">
              {operacoes.map((o, idx) => (
                <div key={idx} className="grid gap-2 border-b border-line pb-2 sm:grid-cols-[1fr_5rem_6rem_5rem_5rem_5rem_2.5rem]">
                  <input
                    className="field-input"
                    value={o.nome}
                    onChange={(e) => setOperacao(idx, "nome", e.target.value)}
                    placeholder="Etapa (preparo, corte, espalhar, adubar, cobrir, herbicida…)"
                    maxLength={40}
                  />
                  <select
                    className="field-input"
                    value={o.maquinaTipo}
                    onChange={(e) => setOperacao(idx, "maquinaTipo", e.target.value)}
                  >
                    {TIPOS_MAQUINA.map((m) => (
                      <option key={m} value={m}>
                        {TIPOS_MAQUINA_LABEL[m]}
                      </option>
                    ))}
                  </select>
                  <input
                    className="field-input tnum"
                    inputMode="decimal"
                    value={o.maquinaValor}
                    onChange={(e) => setOperacao(idx, "maquinaValor", e.target.value)}
                    placeholder="Máquina R$"
                  />
                  <input
                    className="field-input tnum"
                    inputMode="decimal"
                    value={o.maquinaQtd}
                    onChange={(e) => setOperacao(idx, "maquinaQtd", e.target.value)}
                    placeholder="Qtd"
                  />
                  <input
                    className="field-input tnum"
                    inputMode="decimal"
                    value={o.maodeobra}
                    onChange={(e) => setOperacao(idx, "maodeobra", e.target.value)}
                    placeholder="Mão obra R$"
                  />
                  <input
                    className="field-input tnum"
                    inputMode="decimal"
                    value={o.insumo}
                    onChange={(e) => setOperacao(idx, "insumo", e.target.value)}
                    placeholder="Insumo R$"
                  />
                  <button
                    type="button"
                    onClick={() => setOperacoes(operacoes.filter((_, k) => k !== idx))}
                    className="inline-flex size-9 items-center justify-center rounded-lg border border-transparent text-ink-3 transition-colors hover:border-danger-strong/25 hover:bg-danger-soft hover:text-danger-strong"
                    aria-label="Remover etapa"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="tnum text-sm text-ink-2">
                Maquinário: {fmtMoney(totalMaquina)} · Etapas: {fmtMoney(totalOperacoes)} ·{" "}
                <span className="font-semibold text-ink">Total: {fmtMoney(totalPlantio)}</span>
              </span>
              <button type="button" onClick={() => setValor(String(totalPlantio))} className="btn btn-soft">
                Usar este total
              </button>
            </div>
          </div>
        )}

        {!escopoDono && (
          <div className="sm:col-span-2">
            <SeletorInsumos
              id="insumos-plantio"
              talhoes={talhoesFazenda}
              value={insumos}
              onChange={setInsumos}
              alocacoes={porcoes.filter((p) => p.completo || p.tarefas)}
            />
          </div>
        )}

        {escopoDono ? null : (
          <Campo
            label="Área (ha, opcional)"
            htmlFor="areaHa"
            hint="Útil para calcular a média de custo por ha dos plantios."
          >
            <input
              id="areaHa"
              name="areaHa"
              className="field-input tnum"
              inputMode="decimal"
              defaultValue={inicial?.areaHa ?? ""}
              placeholder="Ex.: 20"
            />
          </Campo>
        )}

        <div className="sm:col-span-2">
          <p className="field-label">Tipo de registro</p>
          <SelectorRegistro valor={projecao} onChange={setProjecao} />
          <input type="hidden" name="projecao" value={projecao ? "on" : ""} />
        </div>

        <div className="sm:col-span-2">
          <Campo label="Observações" htmlFor="observacao">
            <textarea
              id="observacao"
              name="observacao"
              className="field-input min-h-20 resize-y"
              maxLength={300}
              defaultValue={inicial?.observacao ?? ""}
              placeholder="Anotações sobre o plantio…"
            />
          </Campo>
        </div>
      </div>

      {escopoDono && resumoDono.length > 0 ? (
        <ResumoPorDono
          linhas={resumoDono}
          totalTarefas={totalDonoTarefas}
          totalValor={totalBase}
        />
      ) : null}

      <div className="flex justify-end">
        <BotaoSubmit>{inicial ? "Salvar alterações" : "Registrar plantio"}</BotaoSubmit>
      </div>
    </form>
  );
}