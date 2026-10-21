"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { fmtMoney, parseDecimal } from "@/lib/format";
import { Campo } from "./forms";

const nf0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const nf3 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });

function num(v: string): number {
  const p = parseDecimal(v);
  return Number.isFinite(p) ? p : 0;
}

function linha(rotulo: string, valor: string) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-sm text-ink-2">{rotulo}</dt>
      <dd className="tnum text-sm font-semibold text-ink">{valor}</dd>
    </div>
  );
}

const paneles = [
  { id: "area", rotulo: "Área" },
  { id: "adubo", rotulo: "Adubo" },
  { id: "herbicida", rotulo: "Herbicida" },
  { id: "muda", rotulo: "Muda" },
];

export function Calculadoras() {
  const [activo, setActivo] = useState("area");

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Calculadoras disponíveis">
        {paneles.map((p) => (
          <button
            key={p.id}
            id={`tab-${p.id}`}
            type="button"
            role="tab"
            aria-selected={activo === p.id}
            aria-controls={`panel-${p.id}`}
            tabIndex={activo === p.id ? 0 : -1}
            onClick={() => setActivo(p.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setActivo(p.id);
              }
            }}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              activo === p.id
                ? "bg-accent text-surface"
                : "bg-surface-muted text-ink-2 hover:bg-surface-muted"
            }`}
          >
            {p.rotulo}
          </button>
        ))}
      </div>

      <div className="ledger-panel p-5 sm:p-6">
        {activo === "area" && (
          <div id="panel-area" role="tabpanel" aria-labelledby="tab-area" tabIndex={0}>
            <AbaArea />
          </div>
        )}
        {activo === "adubo" && (
          <div id="panel-adubo" role="tabpanel" aria-labelledby="tab-adubo" tabIndex={0}>
            <AbaAdubo />
          </div>
        )}
        {activo === "herbicida" && (
          <div id="panel-herbicida" role="tabpanel" aria-labelledby="tab-herbicida" tabIndex={0}>
            <AbaHerbicida />
          </div>
        )}
        {activo === "muda" && (
          <div id="panel-muda" role="tabpanel" aria-labelledby="tab-muda" tabIndex={0}>
            <AbaMuda />
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Área ---------------- */

const BRAZA_M = 2.2;
const TAREFA_M2 = 625 * BRAZA_M * BRAZA_M; // 3.025 m²
const TAREFA_BRACAS_CORRIDAS = 1250;
const HA_M2 = 10000;
const METROS_POR_BRAZA_CORRIDA = 2;

type BaseArea = {
  tarefas: number;
  m2: number;
};

function areaDesde(
  entrada: string,
  tipo: string,
  unidade: string,
  comp: string,
  larg: string,
  nSulcos?: string,
): BaseArea {
  const v = num(entrada);
  const c = num(comp);
  const l = num(larg);
  const factor = unidade === "braças" ? BRAZA_M : 1;
  let m2 = 0;
  switch (tipo) {
    case "tarefas":
      m2 = v * TAREFA_M2;
      break;
    case "ha":
      m2 = v * HA_M2;
      break;
    case "braças2":
      m2 = v * BRAZA_M * BRAZA_M;
      break;
    case "braças-corridas":
      m2 = (v / TAREFA_BRACAS_CORRIDAS) * TAREFA_M2;
      break;
    case "m2":
      m2 = v;
      break;
    case "medidas":
      m2 = c * factor * (l * factor);
      break;
    case "sulcos": {
      const bracas =
        unidade === "braças" ? c : c / METROS_POR_BRAZA_CORRIDA;
      m2 =
        (bracas / TAREFA_BRACAS_CORRIDAS) * num(nSulcos ?? "") * TAREFA_M2;
      break;
    }
  }
  const tarefas = m2 / TAREFA_M2;
  return { tarefas, m2 };
}

function AbaArea() {
  const [tipo, setTipo] = useState("tarefas");
  const [valor, setValor] = useState("");
  const [unidade, setUnidade] = useState("metros");
  const [comp, setComp] = useState("");
  const [larg, setLarg] = useState("");
  const [nSulcos, setNSulcos] = useState("");

  const { tarefas, m2 } = areaDesde(valor, tipo, unidade, comp, larg, nSulcos);

  const comprimentoEmMetros =
    num(comp) * (unidade === "braças" ? METROS_POR_BRAZA_CORRIDA : 1);
  const espacamentoMedio =
    tipo === "sulcos" && comprimentoEmMetros > 0 && num(nSulcos) > 0
      ? m2 / (comprimentoEmMetros * num(nSulcos))
      : 0;

  return (
    <div className="grid gap-4">
      <h2 className="font-display text-lg text-ink">Conversor de área</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Entrada" htmlFor="tipoArea">
          <select
            id="tipoArea"
            className="field-input"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            <option value="tarefas">Tarefas</option>
            <option value="ha">Hectares (ha)</option>
            <option value="braças2">Braças quadradas</option>
            <option value="braças-corridas">Braças corridas</option>
            <option value="m2">Metros quadrados (m²)</option>
            <option value="medidas">Medidas (comprimento × largura)</option>
            <option value="sulcos">Por sulcos (comprimento × nº sulcos)</option>
          </select>
        </Campo>
        {tipo === "sulcos" ? (
          <>
            <Campo
              label="Unidade do comprimento"
              htmlFor="unidadeSulcos"
              hint="1.250 braças corridas = 1 tarefa (1 braça corrida = 2 m)"
            >
              <select
                id="unidadeSulcos"
                className="field-input"
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
              >
                <option value="metros">Metros</option>
                <option value="braças">Braças corridas</option>
              </select>
            </Campo>
            <Campo label="Comprimento" htmlFor="compSulco">
              <input
                id="compSulco"
                className="field-input tnum"
                inputMode="decimal"
                value={comp}
                onChange={(e) => setComp(e.target.value)}
              />
            </Campo>
            <Campo label="Nº de sulcos" htmlFor="nSulcos">
              <input
                id="nSulcos"
                className="field-input tnum"
                inputMode="decimal"
                value={nSulcos}
                onChange={(e) => setNSulcos(e.target.value)}
              />
            </Campo>
          </>
        ) : tipo === "medidas" ? (
          <>
            <Campo label="Unidade das medidas" htmlFor="unidadeMedidas">
              <select
                id="unidadeMedidas"
                className="field-input"
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
              >
                <option value="metros">Metros</option>
                <option value="braças">Braças (1 braça = 2,2 m)</option>
              </select>
            </Campo>
            <Campo label="Comprimento" htmlFor="compMedida">
              <input
                id="compMedida"
                className="field-input tnum"
                inputMode="decimal"
                value={comp}
                onChange={(e) => setComp(e.target.value)}
              />
            </Campo>
            <Campo label="Largura" htmlFor="largMedida">
              <input
                id="largMedida"
                className="field-input tnum"
                inputMode="decimal"
                value={larg}
                onChange={(e) => setLarg(e.target.value)}
              />
            </Campo>
          </>
        ) : (
          <Campo label="Valor" htmlFor="valorArea" hint={tipo === "tarefas" ? "1 tarefa = 3.025 m²" : undefined}>
            <input
              id="valorArea"
              className="field-input tnum"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </Campo>
        )}
      </div>

      <dl className="mt-2 divide-y divide-line rounded-[10px] border border-line bg-surface px-4">
        <div className="flex items-baseline justify-between gap-4 py-2">
          <dt className="text-sm font-medium text-ink">Resultado</dt>
          <dd className="text-xs text-ink-3">em todas as unidades</dd>
        </div>
        {linha("Tarefas", `${nf2.format(tarefas)}`)}
        {linha("Hectares", `${nf3.format(m2 / HA_M2)} ha`)}
        {linha("Braças quadradas", `${nf0.format(tarefas * 625)} braças²`)}
        {linha("Braças corridas", `${nf0.format(tarefas * TAREFA_BRACAS_CORRIDAS)}`)}
        {linha("Metros quadrados", `${nf0.format(m2)} m²`)}
        {tipo === "sulcos" && espacamentoMedio > 0 && (
          <>
            {linha("Comprimento total dos sulcos", `${nf0.format(comprimentoEmMetros * num(nSulcos))} m`)}
            {linha("Espaçamento médio entre sulcos", `${nf2.format(espacamentoMedio)} m`)}
          </>
        )}
      </dl>
    </div>
  );
}

/* ---------------- Adubo ---------------- */

function AbaAdubo() {
  const [tipo, setTipo] = useState("soca");
  const [tarefas, setTarefas] = useState("");
  const [valorAdubo, setValorAdubo] = useState("");

  const sacosTarefa = tipo === "planta" ? 4 : 3;
  const sacos = num(tarefas) * sacosTarefa;
  const kg = sacos * 50;
  const ton = kg / 1000;
  const custo = ton * num(valorAdubo);

  return (
    <div className="grid gap-4">
      <h2 className="font-display text-lg text-ink">Adubo por área</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Tipo de cana" htmlFor="tipoAdubo">
          <select id="tipoAdubo" className="field-input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="planta">Cana planta — 4 sacos de 50 kg por tarefa</option>
            <option value="soca">Cana soca — 3 sacos de 50 kg por tarefa</option>
          </select>
        </Campo>
        <Campo label="Valor da tonelada de adubo (R$)" htmlFor="valorAdubo">
          <input
            id="valorAdubo"
            className="field-input tnum"
            inputMode="decimal"
            value={valorAdubo}
            onChange={(e) => setValorAdubo(e.target.value)}
            placeholder="Ex.: 2.500"
          />
        </Campo>
        <Campo label="Área (tarefas)" htmlFor="tarefasAdubo">
          <input
            id="tarefasAdubo"
            className="field-input tnum"
            inputMode="decimal"
            value={tarefas}
            onChange={(e) => setTarefas(e.target.value)}
          />
        </Campo>
      </div>
      <dl className="mt-2 divide-y divide-line rounded-[10px] border border-line bg-surface px-4">
        {linha("Sacos de 50 kg", `${nf0.format(sacos)}`)}
        {linha("Quilogramos", `${nf0.format(kg)} kg`)}
        {linha("Toneladas", `${nf3.format(ton)} t`)}
        {linha("Custo do adubo", fmtMoney(custo))}
      </dl>
    </div>
  );
}

/* ---------------- Herbicida ---------------- */

type Produto = { nome: string; dose: string; unidade: string };

type Implemento = {
  id: string;
  rotulo: string;
  /** Rótulo do volume do equipamento (tanque/carga/depósito). */
  volumeRotulo: string;
  /** Rótulo do rendimento por carga. */
  rendRotulo: string;
  /** Sugestão de volume (L ou kg). */
  volumeInicial: string;
  /** Sugestão de rendimento por carga. */
  rendInicial: string;
};

const IMPLEMENTOS: Implemento[] = [
  { id: "tratorizado", rotulo: "Pulverizador tratorizado", volumeRotulo: "Tanque (L)", rendRotulo: "Rendimento (ha por tanque)", volumeInicial: "600", rendInicial: "3" },
  { id: "costal", rotulo: "Pulverizador costal", volumeRotulo: "Tanque (L)", rendRotulo: "Rendimento (ha por tanque)", volumeInicial: "20", rendInicial: "0,04" },
  { id: "atomizador", rotulo: "Atomizador", volumeRotulo: "Tanque (L)", rendRotulo: "Rendimento (ha por tanque)", volumeInicial: "300", rendInicial: "1,5" },
  { id: "drone", rotulo: "Drone", volumeRotulo: "Carga (L)", rendRotulo: "Rendimento (ha por carga)", volumeInicial: "10", rendInicial: "1" },
];

function AbaHerbicida() {
  const [implemento, setImplemento] = useState(IMPLEMENTOS[0].id);
  const [tanque, setTanque] = useState(IMPLEMENTOS[0].volumeInicial);
  const [rendimento, setRendimento] = useState(IMPLEMENTOS[0].rendInicial);
  const [produtos, setProdutos] = useState<Produto[]>([{ nome: "", dose: "", unidade: "L/ha" }]);

  // Implementos personalizados, persistidos no navegador.
  const [mostrarNovo, setMostrarNovo] = useState(false);
  const [novoRotulo, setNovoRotulo] = useState("");
  const [novoVol, setNovoVol] = useState("");
  const [novoRend, setNovoRend] = useState("");

  const [extras, setExtras] = useState<Implemento[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem("canagest.implementos.herbicida");
      return raw ? (JSON.parse(raw) as Implemento[]) : [];
    } catch {
      return [];
    }
  });

  function salvarExtras(lista: Implemento[]) {
    setExtras(lista);
    try {
      window.localStorage.setItem("canagest.implementos.herbicida", JSON.stringify(lista));
    } catch {}
  }

  const todos = [...IMPLEMENTOS, ...extras];
  const impl = todos.find((i) => i.id === implemento) ?? IMPLEMENTOS[0];

  const haTanque = num(rendimento);

  function escolherImplemento(id: string) {
    const novo = todos.find((i) => i.id === id) ?? IMPLEMENTOS[0];
    setImplemento(id);
    setTanque(novo.volumeInicial);
    setRendimento(novo.rendInicial);
  }

  function adicionarImplemento() {
    const nome = novoRotulo.trim();
    const vol = parseDecimal(novoVol);
    const rend = parseDecimal(novoRend);
    if (!nome || !Number.isFinite(vol) || vol <= 0 || !Number.isFinite(rend) || rend <= 0) return;
    const novo: Implemento = {
      id: `custom-${Date.now()}`,
      rotulo: nome,
      volumeRotulo: "Tanque (L)",
      rendRotulo: "Rendimento (ha por tanque)",
      volumeInicial: String(vol).replace(".", ","),
      rendInicial: String(rend).replace(".", ","),
    };
    salvarExtras([...extras, novo]);
    setNovoRotulo("");
    setNovoVol("");
    setNovoRend("");
    setMostrarNovo(false);
    escolherImplemento(novo.id);
  }

  function removerImplemento(id: string) {
    salvarExtras(extras.filter((e) => e.id !== id));
    if (implemento === id) {
      setImplemento(IMPLEMENTOS[0].id);
      setTanque(IMPLEMENTOS[0].volumeInicial);
      setRendimento(IMPLEMENTOS[0].rendInicial);
    }
  }

  function setProduto(idx: number, campo: keyof Produto, valor: string) {
    setProdutos(produtos.map((p, k) => (k === idx ? { ...p, [campo]: valor } : p)));
  }

  return (
    <div className="grid gap-4">
      <h2 className="font-display text-lg text-ink">Calda de herbicida</h2>
      <p className="text-xs text-ink-3">
        Escolha o implemento e informe a capacidade e o rendimento. Pode criar o seu próprio implemento
        clicando em &quot;Adicionar implemento&quot;. A dose vem do receituário; o app NÃO recomenda dose —
        só calcula a quantidade por carga.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Implemento" htmlFor="implementoHerbicida">
          <select
            id="implementoHerbicida"
            className="field-input"
            value={implemento}
            onChange={(e) => escolherImplemento(e.target.value)}
          >
            {todos.map((i) => (
              <option key={i.id} value={i.id}>
                {i.rotulo}
              </option>
            ))}
          </select>
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label={impl.volumeRotulo} htmlFor="tanqueL">
            <input id="tanqueL" className="field-input tnum" inputMode="decimal" value={tanque} onChange={(e) => setTanque(e.target.value)} />
          </Campo>
          <Campo label={impl.rendRotulo} htmlFor="rendimento">
            <input id="rendimento" className="field-input tnum" inputMode="decimal" value={rendimento} onChange={(e) => setRendimento(e.target.value)} />
          </Campo>
        </div>
      </div>

      {/* Implementos personalizados */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setMostrarNovo((v) => !v)} className="btn btn-ghost">
          + Adicionar implemento
        </button>
        {extras.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {extras.map((e) => (
              <span key={e.id} className="inline-flex items-center gap-1 rounded-md bg-surface-muted px-2 py-1 text-xs font-medium text-ink-2">
                {e.rotulo}
                <button
                  type="button"
                  onClick={() => removerImplemento(e.id)}
                  className="text-ink-3 hover:text-danger"
                  aria-label={`Remover implemento ${e.rotulo}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {mostrarNovo && (
        <div className="grid gap-3 rounded-[10px] border border-dashed border-line-strong bg-surface/60 p-4">
          <p className="text-sm font-medium text-ink">Novo implemento</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo label="Nome" htmlFor="novoImplNome">
              <input
                id="novoImplNome"
                className="field-input"
                value={novoRotulo}
                onChange={(e) => setNovoRotulo(e.target.value)}
                placeholder="Ex.: Pulverizador elétrico"
                maxLength={60}
              />
            </Campo>
            <Campo label="Capacidade (L)" htmlFor="novoImplVol">
              <input
                id="novoImplVol"
                className="field-input tnum"
                inputMode="decimal"
                value={novoVol}
                onChange={(e) => setNovoVol(e.target.value)}
                placeholder="Ex.: 15"
              />
            </Campo>
            <Campo label="Rendimento (ha por tanque)" htmlFor="novoImplRend">
              <input
                id="novoImplRend"
                className="field-input tnum"
                inputMode="decimal"
                value={novoRend}
                onChange={(e) => setNovoRend(e.target.value)}
                placeholder="Ex.: 0,5"
              />
            </Campo>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={adicionarImplemento}
              disabled={!novoRotulo.trim() || !(Number(parseDecimal(novoVol)) > 0) || !(Number(parseDecimal(novoRend)) > 0)}
              className="btn btn-secondary"
            >
              Salvar implemento
            </button>
            <button type="button" onClick={() => setMostrarNovo(false)} className="btn btn-ghost">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-ink">Produtos</p>
          <button
            type="button"
            onClick={() => setProdutos([...produtos, { nome: "", dose: "", unidade: "L/ha" }])}
            className="text-sm font-semibold text-accent hover:text-accent-strong"
          >
            + Adicionar produto
          </button>
        </div>
        {produtos.map((p, idx) => {
          const quantidade = haTanque > 0 ? num(p.dose) * haTanque : 0;
          return (
            <div key={idx} className="flex items-center gap-2">
              <input
                className="field-input min-w-0 flex-1"
                value={p.nome}
                onChange={(e) => setProduto(idx, "nome", e.target.value)}
                placeholder="Nome do produto"
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
              <span className="tnum w-32 shrink-0 text-right text-sm font-semibold text-ink">
                {nf2.format(quantidade)} {p.unidade === "L/ha" ? "L" : "kg"}/carga
              </span>
              <button
                type="button"
                onClick={() => setProdutos(produtos.filter((_, k) => k !== idx))}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-ink-3 transition-colors hover:border-danger-strong/25 hover:bg-danger-soft hover:text-danger-strong"
                aria-label="Remover produto"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Muda ---------------- */

function AbaMuda() {
  const [area, setArea] = useState("");
  const [espacamento, setEspacamento] = useState("1,5");
  const [gemasMetro, setGemasMetro] = useState("12");
  const [gemasTonelada, setGemasTonelada] = useState("");

  const m2 = num(area) * HA_M2;
  const metros = num(espacamento) > 0 ? m2 / num(espacamento) : 0;
  const gemas = metros * num(gemasMetro);
  const toneladas = gemasTonelada ? gemas / num(gemasTonelada) : 0;

  return (
    <div className="grid gap-4">
      <h2 className="font-display text-lg text-ink">Muda de cana</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Área (ha)" htmlFor="mudaArea">
          <input id="mudaArea" className="field-input tnum" inputMode="decimal" value={area} onChange={(e) => setArea(e.target.value)} />
        </Campo>
        <Campo label="Espaçamento entre sulcos (m)" htmlFor="mudaEsp">
          <input id="mudaEsp" className="field-input tnum" inputMode="decimal" value={espacamento} onChange={(e) => setEspacamento(e.target.value)} />
        </Campo>
        <Campo label="Gemas por metro de sulco" htmlFor="mudaGemas">
          <input id="mudaGemas" className="field-input tnum" inputMode="decimal" value={gemasMetro} onChange={(e) => setGemasMetro(e.target.value)} />
        </Campo>
        <Campo label="Gemas por tonelada de muda (opcional)" htmlFor="mudaTonGemas" hint="Para calcular toneladas de muda.">
          <input id="mudaTonGemas" className="field-input tnum" inputMode="decimal" value={gemasTonelada} onChange={(e) => setGemasTonelada(e.target.value)} />
        </Campo>
      </div>
      <dl className="mt-2 divide-y divide-line rounded-[10px] border border-line bg-surface px-4">
        {linha("Metros de sulco", `${nf0.format(metros)} m`)}
        {linha("Gemas totais", `${nf0.format(gemas)}`)}
        {gemasTonelada ? linha("Toneladas de muda", `${nf3.format(toneladas)} t`) : null}
      </dl>
    </div>
  );
}