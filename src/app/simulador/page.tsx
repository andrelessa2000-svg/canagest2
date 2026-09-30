import { PageHeader } from "@/components/page-header";
import { AbasSimulador } from "@/components/abas-simulador";
import { SimuladorClient } from "@/components/simulador-client";
import { SimuladorPrecoComparacaoClient } from "@/components/SimuladorPrecoComparacaoClient";
import { getMediasHistoricas } from "@/lib/simulador-server";
import { getDadosComparacao } from "@/lib/simulador-server-comparacao";

export const dynamic = "force-dynamic";

export default async function SimuladorPage() {
  const [medias, dados] = await Promise.all([getMediasHistoricas(), getDadosComparacao()]);

  return (
    <>
      <PageHeader
        rotulo="Ferramentas"
        titulo="Simulador de decisão"
        descricao="Parte dos seus números reais e mostra receita, custo, lucro e retorno de cada cenário. Compare alternativas, veja o que acontece se a produtividade ou o preço mudarem e descubra quanto a sua produção valeria em cada mês da moagem."
      />
      <AbasSimulador
        simulador={<SimuladorClient medias={medias} />}
        precoComparacao={
          <SimuladorPrecoComparacaoClient
            colheitas={dados.colheitas}
            precos={dados.precos}
            opcoes={dados.opcoes}
          />
        }
      />
    </>
  );
}
