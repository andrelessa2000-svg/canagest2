"use client";

import type { ReactNode } from "react";
import { Abas } from "@/components/abas";

/**
 * Casca do /simulador: duas ferramentas independentes que dividem a mesma URL.
 * O conteúdo fica em servidor; só a troca de aba acontece aqui.
 */
export function AbasSimulador({
  simulador,
  precoComparacao,
}: {
  simulador: ReactNode;
  precoComparacao: ReactNode;
}) {
  return (
    <Abas
      rotulo="Ferramentas de simulação"
      itens={[
        { id: "decisao", rotulo: "Decisão de plantio", conteudo: simulador },
        { id: "preco", rotulo: "Comparação de preço", conteudo: precoComparacao },
      ]}
    />
  );
}