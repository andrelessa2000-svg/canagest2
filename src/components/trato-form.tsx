"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import type { ActionState } from "@/lib/actions";
import { ESCOPOS_TRATO_LABEL, TIPOS_TRATO_LABEL } from "@/lib/validators";
import { fmtCount, fmtMoney, fmtTarefas, haParaTarefas, parseDecimal, toDateInputValue } from "@/lib/format";
import { quantidadePorRendimento, type ModoProduto } from "@/lib/projecoes";
import { AlertaFormulario, BotaoSubmit, Campo } from "./forms";
import { CampoSafra } from "./campo-safra";
import { SelectorRegistro } from "./selector-registro";
import {
  SeletorPorcoes,
  alocacoesDeJson,
  alocacoesParaJson,
  type Alocacao,
} from "./seletor-porcoes";
import { SeletorInsumos, insumosDeJson, insumosParaJson, type Insumo } from "./seletor-insumos";
import { CelulaMetrica } from "./stat-cells";
import { ResumoPorDono, type LinhaResumoDono } from "./resumo-por-dono";

const nf3 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });

export type FazendaOpcao = {
  id: string;
  nome: string;
  areaHa: number;
  proprietarioNome?: string | null;
};
export type TalhaoOpcao = { id: string; nome: string; fazendaId: string; areaHa: number };

type Produto = { nome: string; dose: string; unidade: string; quantidade: string };
type LinhaCalc = { nome: string; modo: ModoProduto; rende: string; valorUnitario: string };

function num(v: string): number {
  const p = parseDecimal(v);
  return Number.isFinite(p) ? p : 0;
}

type Inicial = {
  fazendaId?: string;
  talhaoId?: string;
  talhoesIds?: string[];
  alocacoes?: unknown;
  insumos?: unknown;
  safra?: string;
  tipo?: string;
  escopo?: string;
  tarefas?: string;
  data?: string;
  valor?: string;
  projecao?: boolean;
  observacao?: string;
  produtos?: Produto[];
};

export function TratoForm({
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
      : inicial?.talhaoId
        ? [
            {
              talhaoId: inicial.talhaoId,
              tarefas: inicial?.tarefas ?? "",
              completo: inicial?.escopo !== "parte",
            },
          ]
        : (inicial?.talhoesIds ?? []).map((id) => ({
            talhaoId: id,
            tarefas: inicial?.tarefas && inicial.talhoesIds?.length === 1 ? inicial.tarefas : "",
            completo: inicial?.escopo !== "parte",
          })),
  );
  const [tipo, setTipo] = useState(inicial?.tipo ?? "adubacao");
  const [projecao, setProjecao] = useState(inicial?.projecao ?? false);
  const [produtos, setProdutos] = useState<Produto[]>(inicial?.produtos ?? []);
  const [insumos, setInsumos] = useState<Insumo[]>(inicial?.insumos ? insumosDeJson(inicial.insumos) : []);
  const [valor, setValor] = useState(inicial?.valor ?? "");
  const [calculadora, setCalculadora] = useState(false);
  const [tipoCana, setTipoCana] = useState("soca");
  const [sacosCustom, setSacosCustom] = useState("3");
  const [areaManual, setAreaManual] = useState<string | null>(null);
  const [pesoSaco, setPesoSaco] = useState("50");
  const [modoValor, setModoValor] = useState("ton");
  const [valorAdubo, setValorAdubo] = useState("");
  const [linhasCalc, setLinhasCalc] = useState<LinhaCalc[]>([
    { nome: "", modo: "tarefa-L", rende: "", valorUnitario: "" },
  ]);

  function setLinhaCalc(idx: number, campo: keyof LinhaCalc, v: string) {
    setLinhasCalc(linhasCalc.map((l, k) => (k === idx ? { ...l, [campo]: v } : l)));
  }

  function usarTotalAdubo() {
    setValor(String(totalAdubo));
    if (kg <= 0) return;
    const existe = produtos.findIndex((p) => p.nome === "Adubo");
    if (existe >= 0) {
      setProdutos(
        produtos.map((p, k) =>
          k === existe ? { ...p, unidade: "kg", quantidade: String(kg) } : p,
        ),
      );
    } else {
      setProdutos([
        ...produtos,
        { nome: "Adubo", dose: "", unidade: "kg", quantidade: String(kg) },
      ]);
    }
  }

  // Grava o valor da calda e registra cada produto com a quantidade a comprar.
  function usarTotalHerbicida() {
    setValor(String(Math.round(totalHerbicida * 100) / 100));
    const novos = linhasCalc
      .map((l, i) => ({ nome: l.nome.trim(), res: calcLinha[i] }))
      .filter((x) => x.nome !== "" && x.res.quantidade > 0)
      .map((x) => ({
        nome: x.nome,
        dose: "",
        unidade: x.res.unidade,
        quantidade: String(Math.round(x.res.quantidade * 100) / 100),
      }));
    if (novos.length > 0) setProdutos(novos);
  }

  const talhoesFazenda = fazendaId
    ? talhoes.filter((t) => t.fazendaId === fazendaId)
    : [];
  const fazendaAtual = fazendas.find((f) => f.id === fazendaId);

  const { alocacoes, talhoesIds, tarefasTotais } = alocacoesParaJson(porcoes, talhoesFazenda);
  const escopoTalhoes = escopo === "talhao" || escopo === "parte";
  const escopoDono =
    escopo === "proprietario" && fazendas.some((f) => f.proprietarioNome);
  const talhaoUnico = porcoes.length === 1 ? porcoes[0].talhaoId : "";

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
    setAreaManual(null);
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
    setAreaManual(null);
  }

  // Área da aplicação: fazenda (escopo fazenda), porções de talhões ou fazendas do dono; manual pode ajustar.
  const areaAutoTarefas =
    escopoDono
      ? totalDonoTarefas
      : escopo === "fazenda" && fazendaAtual
        ? Math.round(haParaTarefas(fazendaAtual.areaHa) * 100) / 100
        : Math.round(tarefasTotais * 100) / 100;
  const tarefasCalc = areaManual !== null ? num(areaManual) : areaAutoTarefas;

  const sacosPorTarefa =
    tipoCana === "planta" ? 4 : tipoCana === "soca" ? 3 : num(sacosCustom);
  const sacos = tarefasCalc * sacosPorTarefa;
  const kg = sacos * num(pesoSaco);
  const toneladas = kg / 1000;
  const totalAdubo = modoValor === "ton" ? toneladas * num(valorAdubo) : sacos * num(valorAdubo);

  const calcLinha = linhasCalc.map((l) => {
    const { unidade, quantidade } = quantidadePorRendimento(l.modo, num(l.rende), tarefasCalc);
    return { unidade, quantidade, custo: quantidade * num(l.valorUnitario) };
  });
  const totalHerbicida = calcLinha.reduce((a, x) => a + x.custo, 0);

  // Resumo por dono: quanto da área, do produto e do valor cai para cada proprietário.
  const ehAdubacao = tipo === "adubacao";
  const ehCalda =
    tipo === "herbicida" || tipo === "insecticida" || tipo === "foliar" || tipo === "formicida";
  const totalBase =
    num(valor) > 0
      ? num(valor)
      : ehAdubacao
        ? totalAdubo
        : ehCalda
          ? totalHerbicida
          : 0;
  const resumoDono: LinhaResumoDono[] = escopoDono
    ? gruposDono
        .map((g) => {
          const tarefas =
            Math.round(
              g.fazendas
                .filter(
                  (f) => fazendasSel === undefined || fazendasSel.includes(f.id),
                )
                .reduce((a, f) => a + tarefasFazenda(f), 0) * 100,
            ) / 100;
          const share = totalDonoTarefas > 0 ? tarefas / totalDonoTarefas : 0;
          let detalhes: string | undefined;
          if (ehAdubacao && sacosPorTarefa > 0) {
            const sacosDono = Math.round(sacos * share);
            detalhes = `${fmtCount(sacosDono)} sacos de ${pesoSaco || "50"} kg`;
          } else if (ehCalda) {
            const itens = calcLinha
              .filter((x) => x.quantidade > 0)
              .map((x) => `${fmtCount(x.quantidade * share)} ${x.unidade}`);
            if (itens.length > 0) detalhes = itens.join(" · ");
          }
          return { dono: g.dono, tarefas, valor: totalBase * share, detalhes };
        })
        .filter((x) => x.tarefas > 0)
    : [];

  function setProduto(idx: number, campo: keyof Produto, val: string) {
    setProdutos(produtos.map((p, k) => (k === idx ? { ...p, [campo]: val } : p)));
  }

  return (
    <form action={action} className="grid gap-5 pb-4">
      <AlertaFormulario mensagem={state && !state.ok ? state.error : undefined} />

      <input type="hidden" name="alocacoes" value={JSON.stringify(alocacoes)} />
      <input type="hidden" name="talhoesIds" value={JSON.stringify(talhoesIds)} />
      <input type="hidden" name="insumos" value={JSON.stringify(insumosParaJson(insumos))} />
      <input type="hidden" name="talhaoId" value={escopoTalhoes ? talhaoUnico : ""} />
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

      <div className="grid gap-4 sm:grid-cols-2">
        {escopoDono ? (
          <div className="sm:col-span-2">
            <Campo
              label="Fazendas a tratar (por dono)"
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
                setAreaManual(null);
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

        <CampoSafra defaultValue={inicial?.safra} usadas={safras} id="safra-trato" />

        <Campo label="Tipo de trato" htmlFor="tipo">
          <select
            id="tipo"
            name="tipo"
            className="field-input"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            {Object.entries(TIPOS_TRATO_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Campo>

        <Campo
          label="Escopo"
          htmlFor="escopo"
          hint="Fazenda inteira rateia por tarefas; talhões vazios ficam fora do rateio."
        >
          <select
            id="escopo"
            name="escopo"
            className="field-input"
            value={escopo}
            onChange={(e) => {
              setEscopo(e.target.value);
              setAreaManual(null);
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

        <Campo
          label="Data"
          htmlFor="data"
          hint={
            escopoDono
              ? `${fazendasEscolhidas.length} ${fazendasEscolhidas.length === 1 ? "fazenda" : "fazendas"} · ${String(totalDonoTarefas).replace(".", ",")} tarefas (base do cálculo)`
              : escopo === "fazenda" && fazendaAtual
                ? `${fazendaAtual.nome} · ${fmtTarefas(fazendaAtual.areaHa)} (base do rateio)`
                : undefined
          }
        >
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
            {calculadora ? "Ocultar calculadora" : "+ Calcular custo"}
          </button>
        </div>

        {calculadora && (
          <div className="rounded-[10px] border border-dashed border-line-strong bg-surface/60 p-4 sm:col-span-2">
            {tipo !== "adubacao" &&
            tipo !== "herbicida" &&
            tipo !== "insecticida" &&
            tipo !== "foliar" &&
            tipo !== "formicida" ? (
              <p className="text-sm text-ink-2">
                A calculadora atende adubação e aplicações (herbicida, inseticida, foliar, formicida).
                Para outros tipos, digite o valor direto no campo Valor.
              </p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Campo
                    label="Área da aplicação (tarefas)"
                    htmlFor="calcAreaAplic"
                    hint="Vem da fazenda/talhões escolhidos acima; pode ajustar."
                  >
                    <input
                      id="calcAreaAplic"
                      className="field-input tnum"
                      inputMode="decimal"
                      value={areaManual !== null ? areaManual : String(tarefasCalc).replace(".", ",")}
                      onChange={(e) => setAreaManual(e.target.value)}
                      placeholder="Escolha a fazenda"
                    />
                  </Campo>
                  <p className="self-end text-xs text-ink-3">
                    {areaAutoTarefas > 0
                      ? `Área cadastrada: ${String(areaAutoTarefas).replace(".", ",")} tarefas`
                      : "Sem área cadastrada — digite as tarefas."}
                  </p>
                </div>

                {tipo === "adubacao" && (
                  <>
                    <p className="mt-3 text-xs text-ink-3">
                      Adubação usa um único produto: o adubo N-P-K. Área × sacos por tarefa → peso →
                      custo.
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <Campo label="Tipo de cana" htmlFor="calcCana">
                        <select
                          id="calcCana"
                          className="field-input"
                          value={tipoCana}
                          onChange={(e) => setTipoCana(e.target.value)}
                        >
                          <option value="planta">Cana planta (4 sacos de 50 kg/tarefa)</option>
                          <option value="soca">Cana soca (3 sacos de 50 kg/tarefa)</option>
                          <option value="custom">Personalizado (sacos/tarefa)</option>
                        </select>
                      </Campo>
                      {tipoCana === "custom" && (
                        <Campo label="Sacos por tarefa" htmlFor="calcSacosCustom">
                          <input
                            id="calcSacosCustom"
                            className="field-input tnum"
                            inputMode="decimal"
                            value={sacosCustom}
                            onChange={(e) => setSacosCustom(e.target.value)}
                          />
                        </Campo>
                      )}
                      <Campo label="Peso por saco (kg)" htmlFor="calcPesoSaco">
                        <input
                          id="calcPesoSaco"
                          className="field-input tnum"
                          inputMode="decimal"
                          value={pesoSaco}
                          onChange={(e) => setPesoSaco(e.target.value)}
                        />
                      </Campo>
                      <Campo label="Preço do adubo" htmlFor="calcModoValor">
                        <select
                          id="calcModoValor"
                          className="field-input"
                          value={modoValor}
                          onChange={(e) => setModoValor(e.target.value)}
                        >
                          <option value="ton">Por tonelada (R$/t)</option>
                          <option value="saco">Por saco (R$/saco)</option>
                        </select>
                      </Campo>
                      <Campo label="Valor do preço" htmlFor="calcValorAdubo">
                        <input
                          id="calcValorAdubo"
                          className="field-input tnum"
                          inputMode="decimal"
                          value={valorAdubo}
                          onChange={(e) => setValorAdubo(e.target.value)}
                        />
                      </Campo>
                    </div>
                    <div className="mt-3 grid gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-4">
                      <CelulaMetrica rotulo="Sacos" valor={fmtCount(Math.round(sacos))} />
                      <CelulaMetrica rotulo="Peso" valor={`${fmtCount(Math.round(kg))} kg`} />
                      <CelulaMetrica rotulo="Toneladas" valor={`${nf3.format(toneladas)} t`} />
                      <CelulaMetrica rotulo="Custo" valor={fmtMoney(totalAdubo)} destaque />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button type="button" onClick={usarTotalAdubo} className="btn btn-soft">
                        Usar este total
                      </button>
                      <span className="text-xs text-ink-3">
                        {sacosPorTarefa} sacos/tarefa × {nf3.format(tarefasCalc)} tarefas ={" "}
                        {fmtCount(Math.round(sacos))} sacos
                      </span>
                    </div>
                  </>
                )}

                {(tipo === "herbicida" || tipo === "insecticida" || tipo === "foliar" || tipo === "formicida") && (
                  <>
                    <p className="mt-3 text-xs text-ink-3">
                      A calda é a mistura de vários produtos. Para cada um, informe quantos hectares (ou
                      tarefas) um litro/quilo cobre e o valor do litro/quilo.
                    </p>
                    <div className="mt-3 grid gap-2">
                      {linhasCalc.map((l, idx) => (
                        <div key={idx} className="flex flex-wrap items-center gap-2">
                          <input
                            className="field-input min-w-0 flex-1"
                            value={l.nome}
                            onChange={(e) => setLinhaCalc(idx, "nome", e.target.value)}
                            placeholder="Produto"
                            maxLength={60}
                          />
                          <select
                            className="field-input w-36"
                            value={l.modo}
                            onChange={(e) => setLinhaCalc(idx, "modo", e.target.value as ModoProduto)}
                          >
                            <option value="tarefa-L">tarefas por litro</option>
                            <option value="tarefa-kg">tarefas por quilo</option>
                            <option value="ha-L">ha por litro</option>
                            <option value="ha-kg">ha por quilo</option>
                          </select>
                          <input
                            className="field-input tnum w-24"
                            inputMode="decimal"
                            value={l.rende}
                            onChange={(e) => setLinhaCalc(idx, "rende", e.target.value)}
                            placeholder="Rende"
                          />
                          <input
                            className="field-input tnum w-24"
                            inputMode="decimal"
                            value={l.valorUnitario}
                            onChange={(e) => setLinhaCalc(idx, "valorUnitario", e.target.value)}
                            placeholder="R$/L|kg"
                          />
                          <span className="tnum w-28 shrink-0 text-right text-xs text-ink-2">
                            {fmtMoney(calcLinha[idx].custo)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setLinhasCalc(linhasCalc.filter((_, k) => k !== idx))}
                            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-ink-3 transition-colors hover:border-danger-strong/25 hover:bg-danger-soft hover:text-danger-strong"
                            aria-label="Quitar linha"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setLinhasCalc([...linhasCalc, { nome: "", modo: "tarefa-L", rende: "", valorUnitario: "" }])
                        }
                        className="text-sm font-semibold text-accent hover:text-accent-strong"
                      >
                        + Adicionar produto
                      </button>
                      {linhasCalc.length > 0 && (
                        <>
                          <span className="tnum text-sm text-ink-2">
                            Total: <span className="font-semibold text-ink">{fmtMoney(totalHerbicida)}</span>
                          </span>
                          <button type="button" onClick={usarTotalHerbicida} className="btn btn-soft">
                            Usar este total
                          </button>
                        </>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-ink-3">
                      Usar este total grava o Valor do trato e registra cada produto com a quantidade a
                      comprar.
                    </p>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {!escopoDono && (
          <div className="sm:col-span-2">
            <SeletorInsumos
              id="insumos-trato"
              talhoes={talhoesFazenda}
              value={insumos}
              onChange={setInsumos}
              alocacoes={porcoes.filter((p) => p.completo || p.tarefas)}
            />
          </div>
        )}

        <div className="sm:col-span-2">
          <p className="field-label">Tipo de registro</p>
          <SelectorRegistro valor={projecao} onChange={setProjecao} />
          <input type="hidden" name="projecao" value={projecao ? "on" : ""} />
        </div>

        {escopoTalhoes && (
        <div className="sm:col-span-2">
          <p className="field-label">Talhões tratados</p>
          <SeletorPorcoes
            id="porcoes-trato"
            talhoes={talhoesFazenda}
            value={porcoes}
            onChange={setPorcoes}
          />
        </div>
      )}

        <div className="sm:col-span-2">
          <Campo label="Observações" htmlFor="observacao">
            <textarea
              id="observacao"
              name="observacao"
              className="field-input min-h-20 resize-y"
              maxLength={300}
              defaultValue={inicial?.observacao ?? ""}
              placeholder="Anotações sobre o trato…"
            />
          </Campo>
        </div>
      </div>

      {tipo === "herbicida" || tipo === "adubacao" || tipo === "formicida" || tipo === "insecticida" || tipo === "foliar" ? (
        <section className="ledger-panel grid gap-4 p-5">
          <h2 className="font-display text-lg text-ink">Produtos/insumos aplicados</h2>
          <p className="text-xs text-ink-3">
            Registre os produtos aplicados (ex.: herbicida ou adubo). Dose só para herbicida — o app NÃO
            recomenda dose. A quantidade por tanque se calcula na calculadora de herbicida.
          </p>
          <input type="hidden" name="produtos" value={JSON.stringify(produtos)} />
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-ink">Produtos aplicados</p>
            <button
              type="button"
              onClick={() =>
                setProdutos([...produtos, { nome: "", dose: "", unidade: "L/ha", quantidade: "" }])
              }
              className="text-sm font-semibold text-accent hover:text-accent-strong"
            >
              + Adicionar produto
            </button>
          </div>
          {produtos.map((p, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                className="field-input min-w-0 flex-1"
                value={p.nome}
                onChange={(e) => setProduto(idx, "nome", e.target.value)}
                placeholder="Nome"
                maxLength={60}
              />
              <input
                className="field-input tnum w-24"
                inputMode="decimal"
                value={p.dose}
                onChange={(e) => setProduto(idx, "dose", e.target.value)}
                placeholder="Dose"
              />
              <select
                className="field-input w-20"
                value={p.unidade}
                onChange={(e) => setProduto(idx, "unidade", e.target.value)}
              >
                <option value="L">Litros (L)</option>
                <option value="kg">Quilos (kg)</option>
                <option value="L/ha">L/ha (dose)</option>
                <option value="kg/ha">kg/ha (dose)</option>
              </select>
              <input
                className="field-input tnum w-28"
                inputMode="decimal"
                value={p.quantidade}
                onChange={(e) => setProduto(idx, "quantidade", e.target.value)}
                placeholder="Quant. tanque"
              />
              <button
                type="button"
                onClick={() => setProdutos(produtos.filter((_, k) => k !== idx))}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-ink-3 transition-colors hover:border-danger-strong/25 hover:bg-danger-soft hover:text-danger-strong"
                aria-label="Remover produto"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </section>
      ) : null}

      {escopoDono && resumoDono.length > 0 ? (
        <ResumoPorDono
          linhas={resumoDono}
          totalTarefas={totalDonoTarefas}
          totalValor={totalBase}
        />
      ) : null}

      <div className="flex justify-end">
        <BotaoSubmit>{inicial ? "Salvar alterações" : "Registrar trato"}</BotaoSubmit>
      </div>
    </form>
  );
}