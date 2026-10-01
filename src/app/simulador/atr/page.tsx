import { PageHeader } from "@/components/page-header";
import SimuladorAtrComparacaoClient from "@/components/SimuladorAtrComparacaoClient";
import { getDadosAtr } from "@/lib/simulador-server-atr";

export const dynamic = "force-dynamic";

export default async function SimuladorAtrPage() {
  const dados = await getDadosAtr();

  return (
    <>
      <PageHeader
        rotulo="Ferramentas"
        titulo="Comparativo de ATR"
        descricao="Informe o ATR anunciado pela usina mês a mês. O comparativo reavalia o valor bruto das colheitas reais pela proporção do ATR de cada mês e simula o próximo mês."
      />
      <SimuladorAtrComparacaoClient
        meses={dados.meses}
        colheitas={dados.colheitas}
        ultimoAtr={dados.ultimoAtr}
      />
    </>
  );
}