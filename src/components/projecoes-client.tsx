"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { Info, Pencil, Trash2 } from "lucide-react";
import {
  calcularAdubo,
  calcularProtocolo,
  calcularServico,
  custoAdubo,
  quantidadePorRendimento,
  rankearProtocolos,
  TIPOS_EXECUCAO_LABEL,
  TIPOS_SERVICO_LABEL,
  type CicloAdubo,
  type ItemCusto,
  type ProtocoloProj,
  type ServicoComparacao,
  type TipoExecucao,
  type TipoServicoProj,
} from "@/lib/projecoes";
import {
  atualizarProjecaoProtocolo,
  atualizarProjecaoServico,
  criarProjecaoProtocolo,
  criarProjecaoServico,
  excluirProjecaoProtocolo,
  excluirProjecaoServico,
  type ActionState,
} from "@/lib/actions-projecoes";
import { fmtMoney, haParaTarefas, parseDecimal } from "@/lib/format";
import { Abas } from "./abas";
import { AlertaFormulario, BotaoSubmit, Campo } from "./forms";
import { ConfirmDelete } from "./confirm-delete";
import { CelulaMetrica } from "./stat-cells";
import { CampoSafra } from "./campo-safra";

type Fazenda = { id: string; nome: string; areaHa: number };

export type ServicoRow = ServicoComparacao & {
  id: string;
  safra: string | null;
  fazendaId: string | null;
  tipoExecucao: TipoExecucao;
  criadoEm: Date;
};

export type ProtocoloRow = ProtocoloProj & {
  id: string;
  safra: string | null;
  fazendaId: string | null;
  criadoEm: Date;
};

const numStr = (v: number | null | undefined) =>
  v == null ? "" : String(v).replace(".", ",");

const fmtN = (v: number, dec = 2) => v.toFixed(dec).replace(".", ",");

/* ---------- Calculadoras de insumo ---------- */

type AdicionarCusto = (nome: string, valor: number) => void;

type ModoProduto = "ha-L" | "ha-kg" | "tarefa-L" | "tarefa-kg";

const MODO_PRODUTO_LABEL: Record<ModoProduto, string> = {
  "ha-L": "ha por litro",
  "ha-kg": "ha por quilo",
  "tarefa-L": "tarefas por litro",
  "tarefa-kg": "tarefas por quilo",
};

/** Fazenda + área em tarefas: ao escolher a fazenda, preenche a área pela soma dos talhões. */
function AreaFazenda({
  fazendas,
  idPrefix,
  fazendaId,
  onFazenda,
  tarefas,
  onTarefas,
}: {
  fazendas: Fazenda[];
  idPrefix: string;
  fazendaId: string;
  onFazenda: (id: string) => void;
  tarefas: string;
  onTarefas: (v: string) => void;
}) {
  return (
    <>
      <Campo label="Fazenda" htmlFor={`${idPrefix}-fazenda`}>
        <select
          id={`${idPrefix}-fazenda`}
          className="field-input"
          value={fazendaId}
          onChange={(e) => {
            const id = e.target.value;
            onFazenda(id);
            const f = fazendas.find((x) => x.id === id);
            if (f) {
              const tarefasF = Math.round(haParaTarefas(f.areaHa) * 100) / 100;
              onTarefas(numStr(tarefasF));
            }
          }}
        >
          <option value="">— escolher e digitar a área —</option>
          {fazendas.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome} ({fmtN(haParaTarefas(f.areaHa), 1)} tarefas)
            </option>
          ))}
        </select>
      </Campo>
      <Campo label="Área (tarefas)" htmlFor={`${idPrefix}-tarefas`} hint="Preenchida pela fazenda; pode ajustar">
        <input
          id={`${idPrefix}-tarefas`}
          className="field-input tnum"
          inputMode="decimal"
          value={tarefas}
          onChange={(e) => onTarefas(e.target.value)}
          placeholder="Ex.: 10"
        />
      </Campo>
    </>
  );
}

/** Adubação: um único produto (adubo N-P-K), em sacos de 50 kg por tarefa. */
function CalcAdubo({ fazendas, onAdicionar }: { fazendas: Fazenda[]; onAdicionar: AdicionarCusto }) {
  const [fazendaId, setFazendaId] = useState("");
  const [tarefas, setTarefas] = useState("");
  const [ciclo, setCiclo] = useState<CicloAdubo>("planta");
  const [precoT, setPrecoT] = useState("");

  const t = Number(parseDecimal(tarefas)) || 0;
  const preco = Number(parseDecimal(precoT)) || 0;
  const a = calcularAdubo(t, ciclo);
  const total = custoAdubo(t, ciclo, preco);
  const valido = t > 0 && preco > 0;

  return (
    <details className="rounded-[10px] border border-line bg-surface-muted p-4">
      <summary className="cursor-pointer select-none text-sm font-semibold text-ink">
        Calculadora de adubação (adubo N-P-K)
      </summary>
      <div className="mt-3 grid gap-3">
        <p className="text-xs text-ink-3">
          A adubação usa um único produto: o adubo N-P-K. Escolha a fazenda e a área vem dos talhões
          cadastrados.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <AreaFazenda
            fazendas={fazendas}
            idPrefix="calc-adubo"
            fazendaId={fazendaId}
            onFazenda={setFazendaId}
            tarefas={tarefas}
            onTarefas={setTarefas}
          />
          <Campo label="Tipo de cana" htmlFor="calc-adubo-ciclo">
            <select
              id="calc-adubo-ciclo"
              className="field-input"
              value={ciclo}
              onChange={(e) => setCiclo(e.target.value as CicloAdubo)}
            >
              <option value="planta">Cana planta — 4 sacos de 50 kg/tarefa</option>
              <option value="soca">Cana soca — 3 sacos de 50 kg/tarefa</option>
            </select>
          </Campo>
          <Campo label="Valor da tonelada de adubo (R$)" htmlFor="calc-adubo-preco">
            <input
              id="calc-adubo-preco"
              className="field-input tnum"
              inputMode="decimal"
              value={precoT}
              onChange={(e) => setPrecoT(e.target.value)}
              placeholder="Ex.: 2.500"
            />
          </Campo>
        </div>
        <dl className="divide-y divide-line rounded-[10px] border border-line bg-surface px-4">
          <div className="flex items-center justify-between py-2 text-sm">
            <dt className="text-ink-2">Sacos de 50 kg</dt>
            <dd className="font-semibold tnum text-ink">{fmtN(a.sacos)}</dd>
          </div>
          <div className="flex items-center justify-between py-2 text-sm">
            <dt className="text-ink-2">Toneladas a comprar</dt>
            <dd className="font-semibold tnum text-ink">{fmtN(a.toneladas, 3)} t</dd>
          </div>
          <div className="flex items-center justify-between py-2 text-sm">
            <dt className="text-ink-2">Valor a pagar</dt>
            <dd className="font-bold tnum text-accent-strong">{fmtMoney(total)}</dd>
          </div>
        </dl>
        <div>
          <button
            type="button"
            disabled={!valido}
            className="text-sm font-semibold text-accent hover:text-accent-strong disabled:cursor-not-allowed disabled:text-ink-3"
            onClick={() =>
              onAdicionar(`Adubo N-P-K ${fmtN(a.toneladas, 2)} t (${fmtN(a.sacos, 1)} sacos)`, total)
            }
          >
            + Adicionar adubo como custo
          </button>
          <p className="mt-1 text-xs text-ink-3">
            Regra da casa: cana planta 5 tarefas = 1 t; cana soca 6,67 tarefas = 1 t.
          </p>
        </div>
      </div>
    </details>
  );
}

type ProdutoCalda = { nome: string; modo: ModoProduto; rende: string; preco: string };

/** Calda (mistura de produtos): herbicida, inseticida, fungicida, adubo foliar… */
function CalcProduto({ fazendas, onAdicionar }: { fazendas: Fazenda[]; onAdicionar: AdicionarCusto }) {
  const [fazendaId, setFazendaId] = useState("");
  const [tarefas, setTarefas] = useState("");
  const [produtos, setProdutos] = useState<ProdutoCalda[]>([
    { nome: "", modo: "tarefa-L", rende: "", preco: "" },
  ]);

  const t = Number(parseDecimal(tarefas)) || 0;

  function calcRow(r: ProdutoCalda) {
    const rende = Number(parseDecimal(r.rende)) || 0;
    const preco = Number(parseDecimal(r.preco)) || 0;
    const { unidade, quantidade } = quantidadePorRendimento(r.modo, rende, t);
    const custo = quantidade * preco;
    const valido = r.nome.trim() !== "" && rende > 0 && preco > 0 && t > 0;
    return { unidade, quantidade, custo, valido };
  }

  const linhas = produtos.map((r) => ({ r, c: calcRow(r) }));
  const totalCalda = linhas.reduce((s, x) => s + x.c.custo, 0);
  const algumValido = linhas.some((x) => x.c.valido);

  function mudar(idx: number, patch: Partial<ProdutoCalda>) {
    setProdutos((atual) => atual.map((r, k) => (k === idx ? { ...r, ...patch } : r)));
  }

  function adicionarCalda() {
    for (const x of linhas) {
      if (!x.c.valido) continue;
      const areaRotulo = x.r.modo.startsWith("ha") ? "ha" : "tarefas";
      const rende = Number(parseDecimal(x.r.rende)) || 0;
      onAdicionar(
        `${x.r.nome.trim()} ${fmtN(x.c.quantidade, 1)} ${x.c.unidade} (${fmtN(rende, 2)} ${areaRotulo}/${x.c.unidade})`,
        x.c.custo,
      );
    }
  }

  return (
    <details className="rounded-[10px] border border-line bg-surface-muted p-4">
      <summary className="cursor-pointer select-none text-sm font-semibold text-ink">
        Calculadora de calda (herbicida, inseticida, foliar…)
      </summary>
      <div className="mt-3 grid gap-3">
        <p className="text-xs text-ink-3">
          A calda é a mistura de vários produtos. Para cada um, informe quantos hectares (ou tarefas) um
          litro/quilo cobre e o valor do litro/quilo.
        </p>
        <AreaFazenda
          fazendas={fazendas}
          idPrefix="calc-prod"
          fazendaId={fazendaId}
          onFazenda={setFazendaId}
          tarefas={tarefas}
          onTarefas={setTarefas}
        />
        {produtos.map((r, idx) => (
          <div key={idx} className="flex flex-wrap items-center gap-2">
            <input
              className="field-input min-w-0 flex-1"
              value={r.nome}
              onChange={(e) => mudar(idx, { nome: e.target.value })}
              placeholder="Nome do produto (ex.: herbicida X)"
              maxLength={60}
            />
            <select
              className="field-input w-40"
              value={r.modo}
              onChange={(e) => mudar(idx, { modo: e.target.value as ModoProduto })}
            >
              {Object.entries(MODO_PRODUTO_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <input
              className="field-input tnum w-24"
              inputMode="decimal"
              value={r.rende}
              onChange={(e) => mudar(idx, { rende: e.target.value })}
              placeholder="Rende"
            />
            <input
              className="field-input tnum w-28"
              inputMode="decimal"
              value={r.preco}
              onChange={(e) => mudar(idx, { preco: e.target.value })}
              placeholder="0,00"
            />
            <button
              type="button"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-ink-3 transition-colors hover:border-danger-strong/25 hover:bg-danger-soft hover:text-danger-strong"
              onClick={() => setProdutos((a) => a.filter((_, k) => k !== idx))}
              aria-label="Remover produto da calda"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <div>
          <button
            type="button"
            className="text-sm font-semibold text-accent hover:text-accent-strong"
            onClick={() => setProdutos((a) => [...a, { nome: "", modo: "tarefa-L", rende: "", preco: "" }])}
          >
            + Adicionar produto na calda
          </button>
        </div>
        <dl className="divide-y divide-line rounded-[10px] border border-line bg-surface px-4">
          <div className="flex items-center justify-between py-2 text-sm">
            <dt className="text-ink-2">Área da aplicação</dt>
            <dd className="tnum text-ink">{t > 0 ? `${fmtN(t, 1)} tarefas` : "escolha a fazenda"}</dd>
          </div>
          {linhas.map(({ r, c }, k) =>
            c.quantidade > 0 ? (
              <div key={k} className="flex items-center justify-between py-2 text-sm">
                <dt className="text-ink-2">{r.nome.trim() || "Produto"} a comprar</dt>
                <dd className="font-semibold tnum text-ink">
                  {fmtN(c.quantidade, 1)} {c.unidade}
                </dd>
              </div>
            ) : null,
          )}
          <div className="flex items-center justify-between py-2 text-sm">
            <dt className="text-ink-2">Valor a pagar (calda)</dt>
            <dd className="font-bold tnum text-accent-strong">{fmtMoney(totalCalda)}</dd>
          </div>
        </dl>
        <div>
          <button
            type="button"
            disabled={!algumValido}
            className="text-sm font-semibold text-accent hover:text-accent-strong disabled:cursor-not-allowed disabled:text-ink-3"
            onClick={adicionarCalda}
          >
            + Adicionar produtos da calda como custos
          </button>
        </div>
      </div>
    </details>
  );
}

/** As duas calculadoras, lado a lado; cada uma adiciona itens na lista de custos. */
function CalculadorasInsumo({ fazendas, onAdicionar }: { fazendas: Fazenda[]; onAdicionar: AdicionarCusto }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <CalcAdubo fazendas={fazendas} onAdicionar={onAdicionar} />
      <CalcProduto fazendas={fazendas} onAdicionar={onAdicionar} />
    </div>
  );
}

/* ---------- Serviço ---------- */

function FormServico({
  fazendas,
  inicial,
  onConcluir,
  onCancelar,
}: {
  fazendas: Fazenda[];
  inicial?: ServicoRow;
  onConcluir?: () => void;
  onCancelar?: () => void;
}) {
  const [state, acaoForm] = useActionState<ActionState | undefined, FormData>(
    (prev, fd) => (inicial ? atualizarProjecaoServico(prev, fd) : criarProjecaoServico(prev, fd)),
    undefined,
  );
  const [tipo, setTipo] = useState<TipoServicoProj>((inicial?.tipo as TipoServicoProj) ?? "plantio");
  const [execucao, setExecucao] = useState<TipoExecucao>(inicial?.tipoExecucao ?? "propria");
  const [itens, setItens] = useState<{ nome: string; valor: string; unidade: "ha" | "total" }[]>(
    inicial
      ? inicial.custos.map((c) => ({
          nome: c.nome,
          valor: numStr(c.valor),
          unidade: c.unidade,
        }))
      : [{ nome: "", valor: "", unidade: "ha" }],
  );
  const [area, setArea] = useState(numStr(inicial?.areaHa));
  const [prod, setProd] = useState(numStr(inicial?.produtividade));
  const [preco, setPreco] = useState(numStr(inicial?.preco));

  // Ao salvar com sucesso em modo edição, volta para o modo de cadastro
  useEffect(() => {
    if (state?.ok) onConcluir?.();
  }, [state, onConcluir]);

  function mudarItem(idx: number, patch: Partial<{ nome: string; valor: string; unidade: "ha" | "total" }>) {
    setItens((atual) => atual.map((i, k) => (k === idx ? { ...i, ...patch } : i)));
  }

  // Prévia
  const custos: ItemCusto[] = itens
    .filter((i) => i.nome.trim() && Number(parseDecimal(i.valor)) > 0)
    .map((i) => ({ nome: i.nome.trim(), valor: Number(parseDecimal(i.valor)), unidade: i.unidade }));
  const previsao = calcularServico({
    id: "prev",
    nome: "Prévia",
    tipo,
    tipoExecucao: execucao,
    areaHa: Number(parseDecimal(area)) || 0,
    custos,
    produtividade: prod ? Number(parseDecimal(prod)) : null,
    preco: preco ? Number(parseDecimal(preco)) : null,
  });

  return (
    <form action={acaoForm} className="grid gap-5">
      <AlertaFormulario mensagem={state && !state.ok ? state.error : undefined} />
      {state?.ok && state.mensagem && (
        <p className="rounded-md border border-accent/30 bg-accent-soft px-3 py-2 text-sm font-medium text-accent-strong">
          {state.mensagem}
        </p>
      )}
      {inicial && (
        <p className="text-sm font-medium text-accent">
          Editando: {inicial.nome} — as alterações substituem os dados salvos.
        </p>
      )}
      {inicial && <input type="hidden" name="id" value={inicial.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Campo label="Nome da comparação" htmlFor="srv-nome">
            <input id="srv-nome" name="nome" className="field-input" defaultValue={inicial?.nome ?? ""} placeholder="Ex.: Plantio da safra 2027" maxLength={80} required />
          </Campo>
        </div>
        <Campo label="Tipo de serviço" htmlFor="srv-tipo">
          <select
            id="srv-tipo"
            name="tipo"
            className="field-input"
            defaultValue={tipo}
            onChange={(e) => setTipo(e.target.value as TipoServicoProj)}
          >
            {Object.entries(TIPOS_SERVICO_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink-3">
            Principais tratos culturais: adubação e herbicida. Cortador de soqueira, controle de praga e
            aplicação foliar têm tipos próprios; o que não couber, use Outro.
          </p>
        </Campo>
        <Campo label="Quem executa" htmlFor="srv-execucao">
          <select
            id="srv-execucao"
            name="tipoExecucao"
            className="field-input"
            defaultValue={execucao}
            onChange={(e) => setExecucao(e.target.value as TipoExecucao)}
          >
            {Object.entries(TIPOS_EXECUCAO_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Campo>
        <CampoSafra defaultValue={inicial?.safra ?? ""} usadas={[]} id="srv-safra" />
        <Campo label="Fazenda (opcional)" htmlFor="srv-fazenda">
          <select id="srv-fazenda" name="fazendaId" className="field-input" defaultValue={inicial?.fazendaId ?? ""}>
            <option value="">Todas / sem fazenda</option>
            {fazendas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Área (ha)" htmlFor="srv-area" hint="Usada para converter custos totais">
          <input id="srv-area" name="areaHa" className="field-input tnum" inputMode="decimal" value={area} onChange={(e) => setArea(e.target.value)} placeholder="20" />
        </Campo>
        <Campo label="Produtividade (t/ha) — opcional" htmlFor="srv-prod" hint="Para ver a rentabilidade deste modo">
          <input id="srv-prod" name="produtividade" className="field-input tnum" inputMode="decimal" value={prod} onChange={(e) => setProd(e.target.value)} placeholder="85" />
        </Campo>
        <Campo label="Preço da cana (R$/t) — opcional" htmlFor="srv-preco">
          <input id="srv-preco" name="preco" className="field-input tnum" inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="164" />
        </Campo>
      </div>

      {/* Itens de custo */}
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-ink">Custos do serviço</p>
          <button
            type="button"
            className="text-sm font-semibold text-accent hover:text-accent-strong"
            onClick={() => setItens((a) => [...a, { nome: "", valor: "", unidade: "ha" }])}
          >
            + Adicionar custo
          </button>
        </div>
        {itens.map((i, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              className="field-input min-w-0 flex-1"
              value={i.nome}
              onChange={(e) => mudarItem(idx, { nome: e.target.value })}
              placeholder="Descrição (mudas, operação, combustível…)"
              maxLength={60}
            />
            <input
              className="field-input tnum w-28"
              inputMode="decimal"
              value={i.valor}
              onChange={(e) => mudarItem(idx, { valor: e.target.value })}
              placeholder="0,00"
            />
            <select
              className="field-input w-40"
              value={i.unidade}
              onChange={(e) => mudarItem(idx, { unidade: e.target.value as "ha" | "total" })}
            >
              <option value="ha">por hectare</option>
              <option value="total">valor total</option>
            </select>
            <button
              type="button"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-ink-3 transition-colors hover:border-danger-strong/25 hover:bg-danger-soft hover:text-danger-strong"
              onClick={() => setItens((a) => a.filter((_, k) => k !== idx))}
              aria-label="Remover custo"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <input type="hidden" name="custos" value={JSON.stringify(custos)} />
      </div>

      {/* Calculadoras de insumo */}
      <CalculadorasInsumo
        fazendas={fazendas}
        onAdicionar={(nome, valor) =>
          setItens((a) => [...a, { nome, valor: numStr(Math.round(valor * 100) / 100), unidade: "total" }])
        }
      />

      {/* Prévia */}
      <div className="metric-grid grid-cols-2 lg:grid-cols-4">
        <CelulaMetrica rotulo="Custo serviço/ha" valor={`${fmtMoney(previsao.custoServicoHa)}/ha`} />
        <CelulaMetrica rotulo="Custo total" valor={fmtMoney(previsao.custoServicoTotal)} />
        {previsao.receitaHa > 0 && (
          <>
            <CelulaMetrica rotulo="Lucro/ha" valor={fmtMoney(previsao.lucroHa)} />
            <CelulaMetrica rotulo="Margem" valor={`${previsao.margem.toFixed(1).replace(".", ",")}%`} />
          </>
        )}
      </div>

      <div className="flex justify-end gap-2">
        {inicial && onCancelar && (
          <button
            type="button"
            className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink-2 transition-colors hover:bg-surface-muted"
            onClick={onCancelar}
          >
            Cancelar
          </button>
        )}
        <BotaoSubmit>{inicial ? "Salvar alterações" : "Salvar comparação de serviço"}</BotaoSubmit>
      </div>
    </form>
  );
}

function ListaServicos({
  servicos,
  idFazenda,
  onEditar,
}: {
  servicos: ServicoRow[];
  idFazenda: (id: string) => string;
  onEditar: (s: ServicoRow) => void;
}) {
  return (
    <div className="grid gap-3">
      {servicos.length === 0 ? (
        <div className="rounded-md border border-line bg-surface-muted p-4 text-sm text-ink-2">
          Nenhuma comparação cadastrada. Monte uma acima e salve.
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Serviço</th>
                <th>Tipo</th>
                <th>Quem executa</th>
                <th className="num">Área</th>
                <th className="num">Custo serviço/ha</th>
                <th className="num">Custo total</th>
                {servicos.some((s) => s.produtividade != null && s.preco != null) && (
                  <th className="num">Lucro/ha</th>
                )}
                <th>
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {servicos.map((s) => {
                const r = calcularServico(s);
                return (
                  <tr key={s.id}>
                    <td className="font-semibold text-ink">
                      {s.nome}
                      {s.safra && <span className="ml-1 text-xs font-normal text-ink-3">({s.safra})</span>}
                      {s.fazendaId && (
                        <span className="ml-1 text-xs font-normal text-ink-3">· {idFazenda(s.fazendaId)}</span>
                      )}
                    </td>
                    <td className="text-ink-2">{TIPOS_SERVICO_LABEL[s.tipo as TipoServicoProj] ?? s.tipo}</td>
                    <td className="text-ink-2">{TIPOS_EXECUCAO_LABEL[s.tipoExecucao] ?? s.tipoExecucao}</td>
                    <td className="num">{s.areaHa ? `${s.areaHa.toFixed(1).replace(".", ",")} ha` : "—"}</td>
                    <td className="num">{fmtMoney(r.custoServicoHa)}</td>
                    <td className="num">{fmtMoney(r.custoServicoTotal)}</td>
                    {s.produtividade != null && s.preco != null && (
                      <td className={`num font-bold ${r.lucroHa < 0 ? "text-danger-strong" : "text-accent-strong"}`}>{fmtMoney(r.lucroHa)}</td>
                    )}
                    <td>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="mr-1 inline-flex size-9 items-center justify-center rounded-lg border border-transparent text-ink-3 transition-colors hover:border-accent/25 hover:bg-accent-soft hover:text-accent-strong"
                          onClick={() => onEditar(s)}
                          aria-label="Editar comparação"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <ConfirmDelete
                          action={excluirProjecaoServico.bind(null, s.id)}
                          titulo="Excluir comparação?"
                          mensagem={`A comparação "${s.nome}" será apagada.`}
                          verbo="Excluir"
                          modo="stay"
                          rotuloAria="Excluir comparação"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- Protocolo ---------- */

function FormProtocolo({
  fazendas,
  inicial,
  onConcluir,
  onCancelar,
}: {
  fazendas: Fazenda[];
  inicial?: ProtocoloRow;
  onConcluir?: () => void;
  onCancelar?: () => void;
}) {
  const [state, acaoForm] = useActionState<ActionState | undefined, FormData>(
    (prev, fd) => (inicial ? atualizarProjecaoProtocolo(prev, fd) : criarProjecaoProtocolo(prev, fd)),
    undefined,
  );
  const [itens, setItens] = useState<{ nome: string; valor: string; unidade: "ha" | "total" }[]>(
    inicial
      ? inicial.custos.map((c) => ({
          nome: c.nome,
          valor: numStr(c.valor),
          unidade: c.unidade,
        }))
      : [{ nome: "", valor: "", unidade: "ha" }],
  );
  const [area, setArea] = useState(numStr(inicial?.areaHa));
  const [prod, setProd] = useState(numStr(inicial?.produtividade));
  const [preco, setPreco] = useState(numStr(inicial?.preco));
  const [cortes, setCortes] = useState(inicial ? String(inicial.cortes) : "5");

  // Ao salvar com sucesso em modo edição, volta para o modo de cadastro
  useEffect(() => {
    if (state?.ok) onConcluir?.();
  }, [state, onConcluir]);

  function mudarItem(idx: number, patch: Partial<{ nome: string; valor: string; unidade: "ha" | "total" }>) {
    setItens((atual) => atual.map((i, k) => (k === idx ? { ...i, ...patch } : i)));
  }

  const custos: ItemCusto[] = itens
    .filter((i) => i.nome.trim() && Number(parseDecimal(i.valor)) > 0)
    .map((i) => ({ nome: i.nome.trim(), valor: Number(parseDecimal(i.valor)), unidade: i.unidade }));
  const previsao = calcularProtocolo({
    id: "prev",
    nome: "Prévia",
    areaHa: Number(parseDecimal(area)) || 0,
    produtividade: Number(parseDecimal(prod)) || 0,
    preco: Number(parseDecimal(preco)) || 0,
    cortes: Number(parseDecimal(cortes)) || 5,
    custos,
  });

  return (
    <form action={acaoForm} className="grid gap-5">
      <AlertaFormulario mensagem={state && !state.ok ? state.error : undefined} />
      {state?.ok && state.mensagem && (
        <p className="rounded-md border border-accent/30 bg-accent-soft px-3 py-2 text-sm font-medium text-accent-strong">
          {state.mensagem}
        </p>
      )}
      {inicial && (
        <p className="text-sm font-medium text-accent">
          Editando: {inicial.nome} — as alterações substituem os dados salvos.
        </p>
      )}
      {inicial && <input type="hidden" name="id" value={inicial.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Campo label="Nome do protocolo" htmlFor="ptc-nome">
            <input id="ptc-nome" name="nome" className="field-input" defaultValue={inicial?.nome ?? ""} placeholder="Ex.: Protocolo caro vs simples" maxLength={80} required />
          </Campo>
        </div>
        <CampoSafra defaultValue={inicial?.safra ?? ""} usadas={[]} id="ptc-safra" />
        <Campo label="Fazenda (opcional)" htmlFor="ptc-fazenda">
          <select id="ptc-fazenda" name="fazendaId" className="field-input" defaultValue={inicial?.fazendaId ?? ""}>
            <option value="">Todas / sem fazenda</option>
            {fazendas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Área (ha)" htmlFor="ptc-area">
          <input id="ptc-area" name="areaHa" className="field-input tnum" inputMode="decimal" value={area} onChange={(e) => setArea(e.target.value)} placeholder="20" required />
        </Campo>
        <Campo label="Produtividade (t/ha)" htmlFor="ptc-prod">
          <input id="ptc-prod" name="produtividade" className="field-input tnum" inputMode="decimal" value={prod} onChange={(e) => setProd(e.target.value)} placeholder="85" required />
        </Campo>
        <Campo label="Preço da cana (R$/t)" htmlFor="ptc-preco">
          <input id="ptc-preco" name="preco" className="field-input tnum" inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="164" required />
        </Campo>
        <Campo label="Cortes esperados" htmlFor="ptc-cortes" hint="Divide o custo do plantio">
          <input id="ptc-cortes" name="cortes" className="field-input tnum" inputMode="numeric" value={cortes} onChange={(e) => setCortes(e.target.value)} />
        </Campo>
      </div>

      {/* Itens de custo */}
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-ink">Custos do protocolo</p>
          <button
            type="button"
            className="text-sm font-semibold text-accent hover:text-accent-strong"
            onClick={() => setItens((a) => [...a, { nome: "", valor: "", unidade: "ha" }])}
          >
            + Adicionar custo
          </button>
        </div>
        {itens.map((i, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              className="field-input min-w-0 flex-1"
              value={i.nome}
              onChange={(e) => mudarItem(idx, { nome: e.target.value })}
              placeholder="Descrição (mudas, correção, calagem, adubação…)"
              maxLength={60}
            />
            <input
              className="field-input tnum w-28"
              inputMode="decimal"
              value={i.valor}
              onChange={(e) => mudarItem(idx, { valor: e.target.value })}
              placeholder="0,00"
            />
            <select
              className="field-input w-40"
              value={i.unidade}
              onChange={(e) => mudarItem(idx, { unidade: e.target.value as "ha" | "total" })}
            >
              <option value="ha">por hectare</option>
              <option value="total">valor total</option>
            </select>
            <button
              type="button"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-ink-3 transition-colors hover:border-danger-strong/25 hover:bg-danger-soft hover:text-danger-strong"
              onClick={() => setItens((a) => a.filter((_, k) => k !== idx))}
              aria-label="Remover custo"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <input type="hidden" name="custos" value={JSON.stringify(custos)} />
      </div>

      {/* Calculadoras de insumo */}
      <CalculadorasInsumo
        fazendas={fazendas}
        onAdicionar={(nome, valor) =>
          setItens((a) => [...a, { nome, valor: numStr(Math.round(valor * 100) / 100), unidade: "total" }])
        }
      />

      {/* Prévia */}
      <div aria-live="polite" className="grid gap-3">
        <p className="eyebrow">Prévia — atualiza enquanto você digita</p>
        <div className="metric-grid grid-cols-2 lg:grid-cols-4">
          <CelulaMetrica rotulo="Custo plantio/ha" valor={`${fmtMoney(previsao.custoPlantioHa)}/ha`} />
          <CelulaMetrica rotulo="Receita/ha" valor={`${fmtMoney(previsao.receitaHa)}/ha`} />
          <CelulaMetrica rotulo="Lucro/ha" valor={`${fmtMoney(previsao.lucroHa)}/ha`} destaque />
          <CelulaMetrica rotulo="Margem" valor={`${previsao.margem.toFixed(1).replace(".", ",")}%`} legenda={`ROI ${previsao.roi.toFixed(0).replace(".", ",")}%`} />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {inicial && onCancelar && (
          <button
            type="button"
            className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink-2 transition-colors hover:bg-surface-muted"
            onClick={onCancelar}
          >
            Cancelar
          </button>
        )}
        <BotaoSubmit>{inicial ? "Salvar alterações" : "Salvar protocolo"}</BotaoSubmit>
      </div>
    </form>
  );
}

function ListaProtocolos({
  protocolos,
  idFazenda,
  onEditar,
}: {
  protocolos: ProtocoloRow[];
  idFazenda: (id: string) => string;
  onEditar: (p: ProtocoloRow) => void;
}) {
  const rank = rankearProtocolos(protocolos);
  const melhor = rank.length > 0 ? rank[0].p.id : null;

  return (
    <div className="grid gap-3">
      {rank.length === 0 ? (
        <div className="rounded-md border border-line bg-surface-muted p-4 text-sm text-ink-2">
          Nenhum protocolo cadastrado. Monte um acima e salve.
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Protocolo</th>
                <th className="num">Área</th>
                <th className="num">t/ha</th>
                <th className="num">Preço/t</th>
                <th className="num">Custo plantio/ha</th>
                <th className="num">Receita/ha</th>
                <th className="num">Lucro/ha</th>
                <th className="num">Margem</th>
                <th className="num">ROI</th>
                <th>
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rank.map(({ p, r }) => (
                <tr key={p.id}>
                  <td className="font-semibold text-ink">
                    <span className="inline-flex items-center gap-2">
                      {p.nome}
                      {p.id === melhor && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-1.5 py-0.5 text-xs font-bold text-accent-strong">
                          Melhor
                        </span>
                      )}
                    </span>
                    {p.safra && <span className="ml-1 text-xs font-normal text-ink-3">({p.safra})</span>}
                    {p.fazendaId && <span className="ml-1 text-xs font-normal text-ink-3">· {idFazenda(p.fazendaId)}</span>}
                  </td>
                  <td className="num">{p.areaHa.toFixed(1).replace(".", ",")} ha</td>
                  <td className="num">{p.produtividade.toFixed(1).replace(".", ",")}</td>
                  <td className="num">{fmtMoney(p.preco)}</td>
                  <td className="num">{fmtMoney(r.custoPlantioHa)}</td>
                  <td className="num">{fmtMoney(r.receitaHa)}</td>
                  <td className={`num font-bold ${r.lucroHa < 0 ? "text-danger-strong" : "text-accent-strong"}`}>{fmtMoney(r.lucroHa)}</td>
                  <td className="num">{r.margem.toFixed(1).replace(".", ",")}%</td>
                  <td className="num">{r.roi.toFixed(0).replace(".", ",")}%</td>
                  <td>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="mr-1 inline-flex size-9 items-center justify-center rounded-lg border border-transparent text-ink-3 transition-colors hover:border-accent/25 hover:bg-accent-soft hover:text-accent-strong"
                        onClick={() => onEditar(p)}
                        aria-label="Editar protocolo"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <ConfirmDelete
                        action={excluirProjecaoProtocolo.bind(null, p.id)}
                        titulo="Excluir protocolo?"
                        mensagem={`O protocolo "${p.nome}" será apagado.`}
                        verbo="Excluir"
                        modo="stay"
                        rotuloAria="Excluir protocolo"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- Tela ---------- */

export function ProjecoesClient({
  fazendas,
  servicos,
  protocolos,
}: {
  fazendas: Fazenda[];
  servicos: ServicoRow[];
  protocolos: ProtocoloRow[];
}) {
  const idFazenda = (id: string) => fazendas.find((f) => f.id === id)?.nome ?? "—";

  const [editServico, setEditServico] = useState<ServicoRow | null>(null);
  const [editProtocolo, setEditProtocolo] = useState<ProtocoloRow | null>(null);

  function editarServico(s: ServicoRow) {
    setEditServico(s);
    requestAnimationFrame(() =>
      document.getElementById("form-servico")?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  function editarProtocolo(p: ProtocoloRow) {
    setEditProtocolo(p);
    requestAnimationFrame(() =>
      document.getElementById("form-protocolo")?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  return (
    <div className="grid gap-6">
      <div className="card flex items-start gap-3 p-4 text-sm text-ink-2">
        <Info className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden="true" />
        <p>
          Os dados cadastrados aqui são <strong>independentes</strong>: servem apenas para planejar safras
          futuras e comparar modos de execução e protocolos. Nada é puxado automaticamente do financeiro,
          do caderno de campo nem de despesas antigas.
        </p>
      </div>

      <Abas
        rotulo="Projeções e comparações"
        itens={[
          {
            id: "servicos",
            rotulo: "Comparação de serviços",
            conteudo: (
              <div className="grid gap-6">
                <section id="form-servico" className="card grid gap-5 p-4 sm:p-6">
                  <div>
                    <h2 className="font-display text-lg text-ink">Comparar custo de um serviço</h2>
                    <p className="text-sm text-ink-2">
                      Monte o custo do serviço para cada modo de execução (próprio, terceirizado ou pela
                      usina) e compare. Cada custo pode ser por hectare ou valor total.
                    </p>
                  </div>
                  <FormServico
                    key={editServico?.id ?? "novo"}
                    fazendas={fazendas}
                    inicial={editServico ?? undefined}
                    onConcluir={() => setEditServico(null)}
                    onCancelar={() => setEditServico(null)}
                  />
                </section>
                <ListaServicos servicos={servicos} idFazenda={idFazenda} onEditar={editarServico} />
              </div>
            ),
          },
          {
            id: "protocolos",
            rotulo: "Rentabilidade de protocolos",
            conteudo: (
              <div className="grid gap-6">
                <section id="form-protocolo" className="card grid gap-5 p-4 sm:p-6">
                  <div>
                    <h2 className="font-display text-lg text-ink">Comparar rentabilidade de protocolos</h2>
                    <p className="text-sm text-ink-2">
                      Protocolos com custo e produtividade diferentes — o caro pode dar mais toneladas, mas a
                      margem não necessariamente acompanha. Cadastre dois ou mais e veja o melhor.
                    </p>
                  </div>
                  <FormProtocolo
                    key={editProtocolo?.id ?? "novo"}
                    fazendas={fazendas}
                    inicial={editProtocolo ?? undefined}
                    onConcluir={() => setEditProtocolo(null)}
                    onCancelar={() => setEditProtocolo(null)}
                  />
                </section>
                <ListaProtocolos protocolos={protocolos} idFazenda={idFazenda} onEditar={editarProtocolo} />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}