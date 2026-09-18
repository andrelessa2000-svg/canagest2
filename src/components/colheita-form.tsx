"use client";

import { useEffect, useMemo, useState, useActionState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { ActionState } from "@/lib/actions";
import { TIPOS_COLHEITA, type TipoColheita } from "@/lib/validators";
import { parseDecimal, toDateInputValue, fmtMoney } from "@/lib/format";
import {
  COMPLEMENTO_TIPOS,
  COMPLEMENTO_TIPO_LABEL,
  DESPESAS,
  calcularColheita,
} from "@/lib/colheita";
import { AlertaFormulario, BotaoSubmit, Campo } from "./forms";
import { CelulaMetrica } from "./stat-cells";

export type TalhaoOpcao = {
  id: string;
  nome: string;
  areaHa: number;
  fazendaId: string;
  fazendaNome: string;
};

export type UsinaOpcao = { id: string; nome: string; modelo: string };

type Campos = {
  talhaoId: string;
  usinaId: string;
  data: string;
  tipo: string;
  toneladas: string;
  valorTonelada: string;
  complemento: string;
  complementoTipo: string;
  atrPorTonelada: string;
  precoKgAtr: string;
  outrosAdicionais: string;
  despCorte: string;
  despTransporte: string;
  despOutrasColheita: string;
  despPlantioUsina: string;
  despArrendamento: string;
  despAdubacao: string;
  despHerbicida: string;
  despOutras: string;
  observacao: string;
};

function num(v: string): number {
  const p = parseDecimal(v);
  return Number.isFinite(p) ? p : 0;
}

export function ColheitaForm({
  acao,
  talhoes,
  usinas,
  inicial,
  talhaoSelecionado,
  modo = "criar",
  cancelarHref = "/colheitas",
}: {
  acao: (
    prev: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
  talhoes: TalhaoOpcao[];
  usinas: UsinaOpcao[];
  inicial?: Partial<Campos>;
  talhaoSelecionado?: string;
  modo?: "criar" | "editar";
  cancelarHref?: string;
}) {
  const [state, acaoForm] = useActionState(acao, undefined);

  const talhaoInicial = inicial?.talhaoId ?? talhaoSelecionado ?? "";

  const [fazendaId, setFazendaId] = useState(
    () => talhoes.find((t) => t.id === talhaoInicial)?.fazendaId ?? "",
  );

  const [c, setC] = useState<Campos>(() => ({
    talhaoId: talhaoInicial,
    usinaId: inicial?.usinaId ?? usinas[0]?.id ?? "",
    data: inicial?.data ?? toDateInputValue(new Date()),
    tipo: inicial?.tipo ?? "planta",
    toneladas: inicial?.toneladas ?? "",
    valorTonelada: inicial?.valorTonelada ?? "",
    complemento: inicial?.complemento ?? "",
    complementoTipo: inicial?.complementoTipo ?? "total",
    atrPorTonelada: inicial?.atrPorTonelada ?? "",
    precoKgAtr: inicial?.precoKgAtr ?? "",
    outrosAdicionais: inicial?.outrosAdicionais ?? "",
    despCorte: inicial?.despCorte ?? "",
    despTransporte: inicial?.despTransporte ?? "",
    despOutrasColheita: inicial?.despOutrasColheita ?? "",
    despPlantioUsina: inicial?.despPlantioUsina ?? "",
    despArrendamento: inicial?.despArrendamento ?? "",
    despAdubacao: inicial?.despAdubacao ?? "",
    despHerbicida: inicial?.despHerbicida ?? "",
    despOutras: inicial?.despOutras ?? "",
    observacao: inicial?.observacao ?? "",
  }));

  useEffect(() => {
    if (state && !state.ok) {
      toast.error(state.error);
    }
  }, [state]);

  const set = (campo: keyof Campos, valor: string) =>
    setC((prev) => ({ ...prev, [campo]: valor }));

  const fazendas = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const t of talhoes) mapa.set(t.fazendaId, t.fazendaNome);
    return [...mapa.entries()].map(([id, nome]) => ({ id, nome }));
  }, [talhoes]);

  const talhoesVisiveis = fazendaId
    ? talhoes.filter((t) => t.fazendaId === fazendaId)
    : [];

  const modelo =
    usinas.find((u) => u.id === c.usinaId)?.modelo ?? "pindorama";
  const ehCoruripe = modelo === "coruripe";

  function trocarFazenda(id: string) {
    setFazendaId(id);
    set("talhaoId", "");
  }

  function trocarUsina(id: string) {
    const m = usinas.find((u) => u.id === id)?.modelo ?? "pindorama";
    setC((prev) =>
      m === "coruripe"
        ? { ...prev, usinaId: id }
        : {
            ...prev,
            usinaId: id,
            atrPorTonelada: "",
            precoKgAtr: "",
            outrosAdicionais: "",
          },
    );
  }

  const resultado = useMemo(
    () =>
      calcularColheita({
        modelo,
        toneladas: num(c.toneladas),
        valorTonelada: num(c.valorTonelada),
        complemento: num(c.complemento),
        complementoTipo: c.complementoTipo,
        atrPorTonelada: num(c.atrPorTonelada),
        precoKgAtr: num(c.precoKgAtr),
        outrosAdicionais: num(c.outrosAdicionais),
        despCorte: num(c.despCorte),
        despTransporte: num(c.despTransporte),
        despOutrasColheita: num(c.despOutrasColheita),
        despPlantioUsina: num(c.despPlantioUsina),
        despArrendamento: num(c.despArrendamento),
        despAdubacao: num(c.despAdubacao),
        despHerbicida: num(c.despHerbicida),
        despOutras: num(c.despOutras),
      }),
    [modelo, c],
  );

  return (
    <form action={acaoForm} className="grid gap-6 pb-4">
      <AlertaFormulario mensagem={state && !state.ok ? state.error : undefined} />

      {/* Identificação */}
      <section className="ledger-panel grid gap-4 p-5 sm:p-6">
        <h2 className="font-display text-lg text-ink">Identificação</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Fazenda" htmlFor="fazendaId">
            <select
              id="fazendaId"
              className="field-input"
              value={fazendaId}
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

          <Campo label="Talhão" htmlFor="talhaoId">
            <select
              id="talhaoId"
              name="talhaoId"
              className="field-input"
              value={c.talhaoId}
              onChange={(e) => set("talhaoId", e.target.value)}
              disabled={!fazendaId}
            >
              <option value="" disabled>
                {fazendaId ? "Selecione o talhão…" : "Escolha a fazenda primeiro"}
              </option>
              {talhoesVisiveis.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} · {t.areaHa.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ha
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
                  {u.nome}
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
        </div>
      </section>

      {/* Produção */}
      <section className="ledger-panel grid gap-4 p-5 sm:p-6">
        <h2 className="font-display text-lg text-ink">Produção</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            label="Toneladas"
            htmlFor="toneladas"
            hint="Aceita vírgula como decimal. Ex.: 2.360,4"
          >
            <input
              id="toneladas"
              name="toneladas"
              className="field-input tnum"
              inputMode="decimal"
              value={c.toneladas}
              onChange={(e) => set("toneladas", e.target.value)}
              placeholder="Ex.: 2.360,4"
            />
          </Campo>

          {ehCoruripe && (
            <Campo
              label="ATR por tonelada"
              htmlFor="atrPorTonelada"
              hint="kg ATR/t — ex.: 125,496"
            >
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
          )}
        </div>

        {ehCoruripe && (
          <p className="text-xs text-ink-3">
            ATR total = {resultado.toneladas.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}{" "}
            t × {(num(c.atrPorTonelada) || 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 })}{" "}
            = {resultado.atrTotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg ATR
          </p>
        )}
      </section>

      {/* Remuneração */}
      <section className="ledger-panel grid gap-4 p-5 sm:p-6">
        <h2 className="font-display text-lg text-ink">Remuneração</h2>

        {ehCoruripe ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              label="Preço do kg de ATR"
              htmlFor="precoKgAtr"
              hint="R$ por kg de ATR"
            >
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
              label="Valor base por tonelada (opcional)"
              htmlFor="valorTonelada"
              hint="Usado se não houver preço do kg de ATR"
            >
              <input
                id="valorTonelada"
                name="valorTonelada"
                className="field-input tnum"
                inputMode="decimal"
                value={c.valorTonelada}
                onChange={(e) => set("valorTonelada", e.target.value)}
                placeholder="Ex.: 149,67"
              />
            </Campo>
            <Campo
              label="Complemento/ágio (R$)"
              htmlFor="complemento"
              hint="Se houver — informado como valor total"
            >
              <input
                id="complemento"
                name="complemento"
                className="field-input tnum"
                inputMode="decimal"
                value={c.complemento}
                onChange={(e) => set("complemento", e.target.value)}
                placeholder="0,00"
              />
            </Campo>
            <Campo label="Outros adicionais (R$)" htmlFor="outrosAdicionais">
              <input
                id="outrosAdicionais"
                name="outrosAdicionais"
                className="field-input tnum"
                inputMode="decimal"
                value={c.outrosAdicionais}
                onChange={(e) => set("outrosAdicionais", e.target.value)}
                placeholder="0,00"
              />
            </Campo>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              label="Valor da tonelada (R$/t)"
              htmlFor="valorTonelada"
              hint="Ex.: 149,67467"
            >
              <input
                id="valorTonelada"
                name="valorTonelada"
                className="field-input tnum"
                inputMode="decimal"
                value={c.valorTonelada}
                onChange={(e) => set("valorTonelada", e.target.value)}
                placeholder="Ex.: 149,67467"
              />
            </Campo>
            <Campo label="Complemento/ágio" htmlFor="complemento">
              <input
                id="complemento"
                name="complemento"
                className="field-input tnum"
                inputMode="decimal"
                value={c.complemento}
                onChange={(e) => set("complemento", e.target.value)}
                placeholder="Ex.: 34.328,39"
              />
            </Campo>
            <Campo label="O complemento é" htmlFor="complementoTipo">
              <select
                id="complementoTipo"
                name="complementoTipo"
                className="field-input"
                value={c.complementoTipo}
                onChange={(e) => set("complementoTipo", e.target.value)}
              >
                {COMPLEMENTO_TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {COMPLEMENTO_TIPO_LABEL[t]}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
        )}
      </section>

      {/* Despesas */}
      <section className="ledger-panel grid gap-4 p-5 sm:p-6">
        <h2 className="font-display text-lg text-ink">Despesas</h2>
        <p className="-mt-2 text-xs text-ink-3">
          Deixe em branco quando não houver. Os valores são tratados como R$ 0,00.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {DESPESAS.map((d) => (
            <Campo key={d.campo} label={d.rotulo} htmlFor={d.campo}>
              <input
                id={d.campo}
                name={d.campo}
                className="field-input tnum"
                inputMode="decimal"
                value={c[d.campo]}
                onChange={(e) => set(d.campo, e.target.value)}
                placeholder="0,00"
              />
            </Campo>
          ))}
        </div>
      </section>

      {/* Resultado */}
      <section className="grid gap-3">
        <h2 className="font-display text-lg text-ink">Resultado</h2>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-3">
          <CelulaMetrica
            rotulo="Receita bruta"
            valor={fmtMoney(resultado.valorBruto)}
          />
          <CelulaMetrica
            rotulo="Total de despesas"
            valor={fmtMoney(resultado.totalDespesas)}
          />
          <CelulaMetrica
            rotulo="Lucro líquido"
            valor={fmtMoney(resultado.lucro)}
            destaque
          />
        </div>
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[10px] border border-line bg-line">
          {[
            { r: "Receita/t", v: fmtMoney(resultado.receitaPorTonelada) },
            { r: "Custo/t", v: fmtMoney(resultado.custoPorTonelada) },
            { r: "Lucro/t", v: fmtMoney(resultado.lucroPorTonelada) },
          ].map((x) => (
            <div key={x.r} className="bg-surface px-4 py-3">
              <p className="eyebrow text-ink-3">{x.r}</p>
              <p className="tnum mt-1 text-sm font-semibold text-ink">{x.v}</p>
            </div>
          ))}
        </div>
        {resultado.toneladas <= 0 && (
          <p className="text-xs text-ink-3">
            Informe as toneladas para calcular o resultado.
          </p>
        )}
      </section>

      {/* Observações */}
      <section className="ledger-panel grid gap-4 p-5 sm:p-6">
        <Campo
          label="Observações"
          htmlFor="observacao"
          hint="Opcional — ex.: condições de colheita, transporte."
        >
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
