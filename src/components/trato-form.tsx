"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import type { ActionState } from "@/lib/actions";
import { ESCOPOS_TRATO_LABEL, TIPOS_TRATO_LABEL } from "@/lib/validators";
import { fmtMoney, parseDecimal, toDateInputValue } from "@/lib/format";
import { AlertaFormulario, BotaoSubmit, Campo } from "./forms";

export type FazendaOpcao = { id: string; nome: string; areaHa: number };
export type TalhaoOpcao = { id: string; nome: string; fazendaId: string; areaHa: number };

type Produto = { nome: string; dose: string; unidade: string; quantidade: string };
type LinhaCalc = { nome: string; dose: string; unidade: string; prezzo: string };

function num(v: string): number {
  const p = parseDecimal(v);
  return Number.isFinite(p) ? p : 0;
}

type Inicial = {
  fazendaId?: string;
  talhaoId?: string;
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
  const [talhaoId, setTalhaoId] = useState(inicial?.talhaoId ?? "");
  const [tipo, setTipo] = useState(inicial?.tipo ?? "adubacao");
  const [projecao, setProjecao] = useState(inicial?.projecao ?? false);
  const [produtos, setProdutos] = useState<Produto[]>(inicial?.produtos ?? []);
  const [valor, setValor] = useState(inicial?.valor ?? "");
  const [calculadora, setCalculadora] = useState(false);
  const [tipoCana, setTipoCana] = useState("soca");
  const [areaTarefas, setAreaTarefas] = useState("");
  const [precoTonAdubo, setPrecoTonAdubo] = useState("");
  const [areaHa, setAreaHa] = useState("");
  const [linhasCalc, setLinhasCalc] = useState<LinhaCalc[]>([]);

  const sacosTarefa = tipoCana === "planta" ? 4 : 3;
  const totalAdubo = num(areaTarefas) * sacosTarefa * 50 * (num(precoTonAdubo) / 1000);
  const totalHerbicida = linhasCalc.reduce(
    (a, l) => a + num(l.dose) * num(areaHa) * num(l.prezzo),
    0,
  );

  function setLinhaCalc(idx: number, campo: keyof LinhaCalc, v: string) {
    setLinhasCalc(linhasCalc.map((l, k) => (k === idx ? { ...l, [campo]: v } : l)));
  }

  const talhoesFazenda = fazendaId
    ? talhoes.filter((t) => t.fazendaId === fazendaId)
    : [];
  const fazendaAtual = fazendas.find((f) => f.id === fazendaId);
  const talhaoAtual = talhoes.find((t) => t.id === talhaoId);

  function setProduto(idx: number, campo: keyof Produto, val: string) {
    setProdutos(produtos.map((p, k) => (k === idx ? { ...p, [campo]: val } : p)));
  }

  return (
    <form action={action} className="grid gap-5 pb-4">
      <AlertaFormulario mensagem={state && !state.ok ? state.error : undefined} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Fazenda" htmlFor="fazendaId">
          <select
            id="fazendaId"
            name="fazendaId"
            className="field-input"
            required
            value={fazendaId}
            onChange={(e) => {
              setFazendaId(e.target.value);
              setTalhaoId("");
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

        <Campo label="Safra" htmlFor="safra" hint="Opcional. Sugere safras usadas antes.">
          <input
            id="safra"
            name="safra"
            className="field-input"
            list="safras-trato"
            defaultValue={inicial?.safra ?? ""}
            placeholder="Ex.: 2026/27"
            maxLength={30}
          />
          <datalist id="safras-trato">
            {safras.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Campo>

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
            onChange={(e) => setEscopo(e.target.value)}
          >
            {Object.entries(ESCOPOS_TRATO_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Campo>

        {escopo === "talhao" || escopo === "parte" ? (
          <Campo label="Talhão" htmlFor="talhaoId">
            <select
              id="talhaoId"
              name="talhaoId"
              className="field-input"
              required
              value={talhaoId}
              onChange={(e) => setTalhaoId(e.target.value)}
              disabled={!fazendaId}
            >
              <option value="" disabled>
                Selecione…
              </option>
              {talhoesFazenda.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </Campo>
        ) : null}

        {escopo === "parte" ? (
          <Campo label="Tarefas" htmlFor="tarefas" hint="Porção tratada do talhão.">
            <input
              id="tarefas"
              name="tarefas"
              className="field-input tnum"
              inputMode="decimal"
              defaultValue={inicial?.tarefas ?? ""}
              required
            />
          </Campo>
        ) : null}

        <Campo
          label="Data"
          htmlFor="data"
          hint={
            escopo === "fazenda" && fazendaAtual
              ? `${fazendaAtual.nome} · ${Math.round(fazendaAtual.areaHa * 3.3)} tarefas (base do rateio)`
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
            {tipo === "adubacao" ? (
              <>
                <p className="text-xs text-ink-3">
                  Cana planta: 4 sacos de 50 kg por tarefa · Cana soca: 3 sacos. O app calcula o custo.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <Campo label="Tipo de cana" htmlFor="calcCana">
                    <select
                      id="calcCana"
                      className="field-input"
                      value={tipoCana}
                      onChange={(e) => setTipoCana(e.target.value)}
                    >
                      <option value="planta">Cana planta (4 sacos/tarefa)</option>
                      <option value="soca">Cana soca (3 sacos/tarefa)</option>
                    </select>
                  </Campo>
                  <Campo label="Área aplicada (tarefas)" htmlFor="calcTarefas">
                    <input
                      id="calcTarefas"
                      className="field-input tnum"
                      inputMode="decimal"
                      value={areaTarefas}
                      onChange={(e) => setAreaTarefas(e.target.value)}
                    />
                  </Campo>
                  <Campo label="Preço da tonelada de adubo" htmlFor="calcPrecoAdubo">
                    <input
                      id="calcPrecoAdubo"
                      className="field-input tnum"
                      inputMode="decimal"
                      value={precoTonAdubo}
                      onChange={(e) => setPrecoTonAdubo(e.target.value)}
                    />
                  </Campo>
                </div>
                <p className="mt-3 text-sm text-ink-2">
                  Custo calculado: <span className="tnum font-semibold text-ink">{fmtMoney(totalAdubo)}</span>
                </p>
                <button type="button" onClick={() => setValor(String(totalAdubo))} className="btn btn-soft">
                  Usar este total
                </button>
              </>
            ) : tipo === "herbicida" ? (
              <>
                <p className="text-xs text-ink-3">
                  Produtos da calda: dose (L/ha ou kg/ha) × área aplicada × preço por unidade. O app
                  calcula cada produto e o total.
                </p>
                <div className="mt-3 grid gap-2">
                  {linhasCalc.map((l, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        className="field-input min-w-0 flex-1"
                        value={l.nome}
                        onChange={(e) => setLinhaCalc(idx, "nome", e.target.value)}
                        placeholder="Produto"
                        maxLength={60}
                      />
                      <input
                        className="field-input tnum w-20"
                        inputMode="decimal"
                        value={l.dose}
                        onChange={(e) => setLinhaCalc(idx, "dose", e.target.value)}
                        placeholder="Dose"
                      />
                      <select
                        className="field-input w-20"
                        value={l.unidade}
                        onChange={(e) => setLinhaCalc(idx, "unidade", e.target.value)}
                      >
                        <option value="L/ha">L/ha</option>
                        <option value="kg/ha">kg/ha</option>
                      </select>
                      <input
                        className="field-input tnum w-24"
                        inputMode="decimal"
                        value={l.prezzo}
                        onChange={(e) => setLinhaCalc(idx, "prezzo", e.target.value)}
                        placeholder="R$/L|kg"
                      />
                      <span className="tnum w-28 shrink-0 text-right text-xs text-ink-2">
                        {fmtMoney(num(l.dose) * num(areaHa) * num(l.prezzo))}
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
                    onClick={() => setLinhasCalc([...linhasCalc, { nome: "", dose: "", unidade: "L/ha", prezzo: "" }])}
                    className="text-sm font-semibold text-accent hover:text-accent-strong"
                  >
                    + Adicionar produto
                  </button>
                  <Campo label="Área aplicada (ha)" htmlFor="calcAreaHa">
                    <input
                      id="calcAreaHa"
                      className="field-input tnum"
                      inputMode="decimal"
                      value={areaHa}
                      onChange={(e) => setAreaHa(e.target.value)}
                    />
                  </Campo>
                  <span className="tnum text-sm text-ink-2">
                    Total: <span className="font-semibold text-ink">{fmtMoney(totalHerbicida)}</span>
                  </span>
                  <button type="button" onClick={() => setValor(String(totalHerbicida))} className="btn btn-soft">
                    Usar este total
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-2">
                Use esta calculadora para adubação e herbicida. Para outros tipos, digite o valor direto.
              </p>
            )}
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              name="projecao"
              className="size-4 accent-[var(--accent)]"
              checked={projecao}
              onChange={(e) => setProjecao(e.target.checked)}
            />
            É uma projeção (simulada, ainda não aconteceu)
          </label>
        </div>

        {escopo === "talhao" && talhaoAtual && (
          <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-ink-2">
            {talhaoAtual.nome} · {Math.round(talhaoAtual.areaHa * 3.3)} tarefas
          </p>
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

      {tipo === "herbicida" && (
        <section className="ledger-panel grid gap-4 p-5">
          <h2 className="font-display text-lg text-ink">Produtos da calda</h2>
          <p className="text-xs text-ink-3">
            Dose segundo o receituário (o app NÃO recomenda dose). A quantidade por tanque se calcula
            na calculadora de herbicida; aquí puedes anotar lo aplicado.
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
                <option value="L/ha">L/ha</option>
                <option value="kg/ha">kg/ha</option>
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
      )}

      <div className="flex justify-end">
        <BotaoSubmit>{inicial ? "Salvar alterações" : "Registrar trato"}</BotaoSubmit>
      </div>
    </form>
  );
}