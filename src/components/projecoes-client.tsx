"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Info, Trash2 } from "lucide-react";
import {
  calcularProtocolo,
  calcularServico,
  rankearProtocolos,
  TIPOS_EXECUCAO_LABEL,
  TIPOS_SERVICO_LABEL,
  type ItemCusto,
  type ProtocoloProj,
  type ServicoComparacao,
  type TipoExecucao,
  type TipoServicoProj,
} from "@/lib/projecoes";
import {
  criarProjecaoProtocolo,
  criarProjecaoServico,
  excluirProjecaoProtocolo,
  excluirProjecaoServico,
  type ActionState,
} from "@/lib/actions-projecoes";
import { fmtMoney, parseDecimal } from "@/lib/format";
import { Abas } from "./abas";
import { AlertaFormulario, BotaoSubmit, Campo } from "./forms";
import { ConfirmDelete } from "./confirm-delete";
import { CelulaMetrica } from "./stat-cells";
import { CampoSafra } from "./campo-safra";

type Fazenda = { id: string; nome: string };

/* ---------- Serviço ---------- */

function FormServico({ fazendas }: { fazendas: Fazenda[] }) {
  const [state, acaoForm] = useActionState<ActionState | undefined, FormData>(criarProjecaoServico, undefined);
  const [tipo, setTipo] = useState<TipoServicoProj>("plantio");
  const [execucao, setExecucao] = useState<TipoExecucao>("propria");
  const [itens, setItens] = useState<{ nome: string; valor: string; unidade: "ha" | "total" }[]>([
    { nome: "", valor: "", unidade: "ha" },
  ]);
  const [area, setArea] = useState("");
  const [prod, setProd] = useState("");
  const [preco, setPreco] = useState("");

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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Campo label="Nome da comparação" htmlFor="srv-nome">
            <input id="srv-nome" name="nome" className="field-input" placeholder="Ex.: Plantio da safra 2027" maxLength={80} required />
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
        <CampoSafra defaultValue="" usadas={[]} id="srv-safra" />
        <Campo label="Fazenda (opcional)" htmlFor="srv-fazenda">
          <select id="srv-fazenda" name="fazendaId" className="field-input" defaultValue="">
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

      <div className="flex justify-end">
        <BotaoSubmit>Salvar comparação de serviço</BotaoSubmit>
      </div>
    </form>
  );
}

function ListaServicos({
  servicos,
  idFazenda,
}: {
  servicos: (ServicoComparacao & { id: string; safra: string | null; fazendaId: string | null; tipoExecucao: TipoExecucao; criadoEm: Date })[];
  idFazenda: (id: string) => string;
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

function FormProtocolo({ fazendas }: { fazendas: Fazenda[] }) {
  const [state, acaoForm] = useActionState<ActionState | undefined, FormData>(criarProjecaoProtocolo, undefined);
  const [itens, setItens] = useState<{ nome: string; valor: string; unidade: "ha" | "total" }[]>([
    { nome: "", valor: "", unidade: "ha" },
  ]);
  const [area, setArea] = useState("");
  const [prod, setProd] = useState("");
  const [preco, setPreco] = useState("");
  const [cortes, setCortes] = useState("5");

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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Campo label="Nome do protocolo" htmlFor="ptc-nome">
            <input id="ptc-nome" name="nome" className="field-input" placeholder="Ex.: Protocolo caro vs simples" maxLength={80} required />
          </Campo>
        </div>
        <CampoSafra defaultValue="" usadas={[]} id="ptc-safra" />
        <Campo label="Fazenda (opcional)" htmlFor="ptc-fazenda">
          <select id="ptc-fazenda" name="fazendaId" className="field-input" defaultValue="">
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

      <div className="flex justify-end">
        <BotaoSubmit>Salvar protocolo</BotaoSubmit>
      </div>
    </form>
  );
}

function ListaProtocolos({
  protocolos,
  idFazenda,
}: {
  protocolos: (ProtocoloProj & { id: string; safra: string | null; fazendaId: string | null; criadoEm: Date })[];
  idFazenda: (id: string) => string;
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
  servicos: (ServicoComparacao & { id: string; safra: string | null; fazendaId: string | null; tipoExecucao: TipoExecucao; criadoEm: Date })[];
  protocolos: (ProtocoloProj & { id: string; safra: string | null; fazendaId: string | null; criadoEm: Date })[];
}) {
  const idFazenda = (id: string) => fazendas.find((f) => f.id === id)?.nome ?? "—";

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
                <section className="card grid gap-5 p-4 sm:p-6">
                  <div>
                    <h2 className="font-display text-lg text-ink">Comparar custo de um serviço</h2>
                    <p className="text-sm text-ink-2">
                      Monte o custo do serviço para cada modo de execução (próprio, terceirizado ou pela
                      usina) e compare. Cada custo pode ser por hectare ou valor total.
                    </p>
                  </div>
                  <FormServico fazendas={fazendas} />
                </section>
                <ListaServicos servicos={servicos} idFazenda={idFazenda} />
              </div>
            ),
          },
          {
            id: "protocolos",
            rotulo: "Rentabilidade de protocolos",
            conteudo: (
              <div className="grid gap-6">
                <section className="card grid gap-5 p-4 sm:p-6">
                  <div>
                    <h2 className="font-display text-lg text-ink">Comparar rentabilidade de protocolos</h2>
                    <p className="text-sm text-ink-2">
                      Protocolos com custo e produtividade diferentes — o caro pode dar mais toneladas, mas a
                      margem não necessariamente acompanha. Cadastre dois ou mais e veja o melhor.
                    </p>
                  </div>
                  <FormProtocolo fazendas={fazendas} />
                </section>
                <ListaProtocolos protocolos={protocolos} idFazenda={idFazenda} />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}