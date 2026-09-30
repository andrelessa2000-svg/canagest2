"use client";

import { useId, useState, type ReactNode } from "react";
import { CircleCheck, PencilLine, TrendingUp, type LucideIcon } from "lucide-react";
import {
  CLASSE_ORIGEM,
  ROTULO_ORIGEM,
  type OrigemValor,
} from "@/lib/simulador-preco-comparacao";

/**
 * Ícone por origem. A cor sozinha nunca carrega o significado: o selo sempre
 * mostra ícone + sigla em texto.
 */
const ICONE_ORIGEM: Record<OrigemValor, LucideIcon> = {
  real: CircleCheck,
  simulacao: PencilLine,
  projecao: TrendingUp,
};

export type ItemAba = {
  id: string;
  rotulo: string;
  conteudo: ReactNode;
};

/**
 * Abas acessíveis: teclado com setas, Home/End e `aria-controls` correto.
 *
 * Todos os painéis ficam montados e só a visibilidade muda, para que o que o
 * usuário digitou em uma aba não se perca ao trocar de aba.
 *
 * `ativa`/`onChange` tornam o componente controlado; sem eles, o estado é interno.
 */
export function Abas({
  itens,
  ativa,
  onChange,
  rotulo,
  className = "",
}: {
  itens: ItemAba[];
  ativa?: string;
  onChange?: (id: string) => void;
  rotulo: string;
  className?: string;
}) {
  const [interna, setInterna] = useState(itens[0]?.id ?? "");
  const base = useId();
  const atual = ativa ?? interna;
  const abaId = (id: string) => `${base}-${id}`;
  const painelId = (id: string) => `${base}-${id}-painel`;

  function selecionar(id: string) {
    if (!ativa) setInterna(id);
    onChange?.(id);
  }

  function aoTeclar(e: React.KeyboardEvent<HTMLDivElement>) {
    const i = itens.findIndex((it) => it.id === atual);
    if (i < 0) return;
    let proximo = i;
    if (e.key === "ArrowRight") proximo = (i + 1) % itens.length;
    else if (e.key === "ArrowLeft") proximo = (i - 1 + itens.length) % itens.length;
    else if (e.key === "Home") proximo = 0;
    else if (e.key === "End") proximo = itens.length - 1;
    else return;
    e.preventDefault();
    selecionar(itens[proximo].id);
    document.getElementById(abaId(itens[proximo].id))?.focus();
  }

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={rotulo}
        onKeyDown={aoTeclar}
        className="-mx-1 mb-5 flex gap-1 overflow-x-auto border-b border-line px-1"
      >
        {itens.map((it) => {
          const selecionada = it.id === atual;
          return (
            <button
              key={it.id}
              type="button"
              role="tab"
              id={abaId(it.id)}
              aria-selected={selecionada}
              aria-controls={painelId(it.id)}
              tabIndex={selecionada ? 0 : -1}
              onClick={() => selecionar(it.id)}
              className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[0.9375rem] font-semibold transition-colors ${
                selecionada
                  ? "border-accent text-accent-strong"
                  : "border-transparent text-ink-3 hover:border-line-strong hover:text-ink"
              }`}
            >
              {it.rotulo}
            </button>
          );
        })}
      </div>

      {itens.map((it) => (
        <div
          key={it.id}
          role="tabpanel"
          id={painelId(it.id)}
          aria-labelledby={abaId(it.id)}
          hidden={it.id !== atual}
        >
          {it.conteudo}
        </div>
      ))}
    </div>
  );
}

/** Selo de origem do valor: ícone + REAL / SIMULAÇÃO / PROJEÇÃO. */
export function SeloOrigem({ origem }: { origem: OrigemValor }) {
  const Icone = ICONE_ORIGEM[origem];
  return (
    <span
      title={ROTULO_ORIGEM[origem].descricao}
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-bold whitespace-nowrap ${CLASSE_ORIGEM[origem]}`}
    >
      <Icone className="size-3" aria-hidden="true" />
      {ROTULO_ORIGEM[origem].sigla}
    </span>
  );
}

/** Legenda textual do que significa cada origem — usada abaixo dos gráficos. */
export function LegendaOrigens() {
  return (
    <ul className="grid gap-1.5">
      {(Object.keys(ROTULO_ORIGEM) as OrigemValor[]).map((o) => (
        <li key={o} className="flex items-start gap-2 text-xs text-ink-2">
          <SeloOrigem origem={o} />
          <span>{ROTULO_ORIGEM[o].descricao}</span>
        </li>
      ))}
    </ul>
  );
}