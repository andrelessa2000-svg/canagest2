"use client";

import { Fragment } from "react";
import { fmtMoney } from "@/lib/format";

export type LinhaResumoDono = {
  dono: string;
  tarefas: number;
  valor: number;
  /** Resumo de produto/insumo desta parte (ex.: "90 sacos · 4.500 kg"). */
  detalhes?: string;
};

function numArred(v: number) {
  return Math.round(v * 100) / 100;
}

export function ResumoPorDono({
  linhas,
  totalTarefas,
  totalValor,
}: {
  linhas: LinhaResumoDono[];
  totalTarefas: number;
  totalValor: number;
}) {
  if (linhas.length === 0) return null;
  return (
    <div className="rounded-[10px] border border-line bg-surface-muted px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-ink-2">
        Resumo por dono (rateio pela área)
      </p>
      <table className="mt-2 w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-ink-3">
            <th className="py-1 font-medium">Dono</th>
            <th className="py-1 text-right font-medium">Tarefas</th>
            <th className="py-1 text-right font-medium">Valor</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <Fragment key={l.dono}>
              <tr className="border-t border-line">
                <td className="py-1.5 pr-2 font-medium text-ink">{l.dono}</td>
                <td className="py-1.5 text-right text-ink-2 tnum">
                  {String(numArred(l.tarefas)).replace(".", ",")}
                </td>
                <td className="py-1.5 text-right font-semibold text-ink tnum">
                  {fmtMoney(l.valor)}
                </td>
              </tr>
              {l.detalhes ? (
                <tr>
                  <td colSpan={3} className="pb-1 text-xs text-ink-3">
                    {l.detalhes}
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
          <tr className="border-t border-line-strong">
            <td className="py-1.5 pr-2 text-xs font-bold uppercase tracking-wide text-ink-2">
              Total
            </td>
            <td className="py-1.5 text-right text-sm font-semibold text-ink tnum">
              {String(numArred(totalTarefas)).replace(".", ",")}
            </td>
            <td className="py-1.5 text-right text-sm font-bold text-ink tnum">
              {fmtMoney(totalValor)}
            </td>
          </tr>
        </tbody>
      </table>
      <p className="mt-1 text-xs text-ink-3">
        O pedido total e o quanto cada dono paga — cada um recebe o registro da sua parte.
      </p>
    </div>
  );
}
