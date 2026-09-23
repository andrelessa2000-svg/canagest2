"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { parseDecimal } from "@/lib/format";
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
      <div className="flex flex-wrap gap-1" role="tablist">
        {paneles.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={activo === p.id}
            onClick={() => setActivo(p.id)}
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
        {activo === "area" && <AbaArea />}
        {activo === "adubo" && <AbaAdubo />}
        {activo === "herbicida" && <AbaHerbicida />}
        {activo === "muda" && <AbaMuda />}
      </div>
    </div>
  );
}

/* ---------------- Área ---------------- */

const BRAZA_M = 2.2;
const TAREFA_M2 = 625 * BRAZA_M * BRAZA_M; // 3.025 m²
const TAREFA_BRACAS_CORRIDAS = 1250;
const HA_M2 = 10000;

type BaseArea = {
  tarefas: number;
  m2: number;
};

function areaDesde(entrada: string, tipo: string, unidade: string, comp: string, larg: string): BaseArea {
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

  const { tarefas, m2 } = areaDesde(valor, tipo, unidade, comp, larg);

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
          </select>
        </Campo>
        {tipo === "medidas" ? (
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
          <dd className="text-xs text-ink-3">em todas las unidades</dd>
        </div>
        {linha("Tarefas", `${nf2.format(tarefas)}`)}
        {linha("Hectares", `${nf3.format(m2 / HA_M2)} ha`)}
        {linha("Braças quadradas", `${nf0.format(tarefas * 625)} braças²`)}
        {linha("Braças corridas", `${nf0.format(tarefas * TAREFA_BRACAS_CORRIDAS)}`)}
        {linha("Metros quadrados", `${nf0.format(m2)} m²`)}
      </dl>
    </div>
  );
}

/* ---------------- Adubo ---------------- */

function AbaAdubo() {
  const [tipo, setTipo] = useState("soca");
  const [tarefas, setTarefas] = useState("");

  const sacosTarefa = tipo === "planta" ? 4 : 3;
  const sacos = num(tarefas) * sacosTarefa;
  const kg = sacos * 50;
  const ton = kg / 1000;

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
      </dl>
    </div>
  );
}

/* ---------------- Herbicida ---------------- */

type Produto = { nome: string; dose: string; unidade: string };

function AbaHerbicida() {
  const [tanque, setTanque] = useState("600");
  const [rendimiento, setRendimiento] = useState("3");
  const [produtos, setProdutos] = useState<Produto[]>([{ nome: "", dose: "", unidade: "L/ha" }]);

  const haTanque = num(rendimiento);
  const tanqueL = num(tanque);

  function setProduto(idx: number, campo: keyof Produto, valor: string) {
    setProdutos(produtos.map((p, k) => (k === idx ? { ...p, [campo]: valor } : p)));
  }

  return (
    <div className="grid gap-4">
      <h2 className="font-display text-lg text-ink">Calda — barra tratorizada</h2>
      <p className="text-xs text-ink-3">
        Tanque de {tanqueL || "600"} L, rinde {nf2.format(haTanque)} ha por tanque. A dose vem do
        receituário; o app NÃO recomenda dose.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Tanque (L)" htmlFor="tanqueL">
          <input id="tanqueL" className="field-input tnum" inputMode="decimal" value={tanque} onChange={(e) => setTanque(e.target.value)} />
        </Campo>
        <Campo label="Rendimento (ha por tanque)" htmlFor="rendimiento">
          <input id="rendimiento" className="field-input tnum" inputMode="decimal" value={rendimiento} onChange={(e) => setRendimiento(e.target.value)} />
        </Campo>
      </div>

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
              <span className="tnum w-28 shrink-0 text-right text-sm font-semibold text-ink">
                {nf2.format(quantidade)} {p.unidade === "L/ha" ? "L" : "kg"}/tanque
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
  const [espaciamiento, setEspaciamiento] = useState("1,5");
  const [gemasMetro, setGemasMetro] = useState("12");
  const [gemasTonelada, setGemasTonelada] = useState("");

  const m2 = num(area) * HA_M2;
  const metros = num(espaciamiento) > 0 ? m2 / num(espaciamiento) : 0;
  const gemas = metros * num(gemasMetro);
  const toneladas = gemasTonelada ? gemas / num(gemasTonelada) : 0;

  return (
    <div className="grid gap-4">
      <h2 className="font-display text-lg text-ink">Muda de cana</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Área (ha)" htmlFor="mudaArea">
          <input id="mudaArea" className="field-input tnum" inputMode="decimal" value={area} onChange={(e) => setArea(e.target.value)} />
        </Campo>
        <Campo label="Espaciamiento entre sulcos (m)" htmlFor="mudaEsp">
          <input id="mudaEsp" className="field-input tnum" inputMode="decimal" value={espaciamiento} onChange={(e) => setEspaciamiento(e.target.value)} />
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