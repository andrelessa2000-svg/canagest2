import { PageHeader } from "@/components/page-header";
import { SimuladorClient } from "@/components/simulador-client";
import { getMediasHistoricas } from "@/lib/simulador-server";

export const dynamic = "force-dynamic";

export default async function SimuladorPage() {
  const medias = await getMediasHistoricas();
  return (
    <>
      <PageHeader
        rotulo="Ferramentas"
        titulo="Simulador de decisão"
        descricao="Parte dos seus números reais e mostra receita, custo, lucro e retorno de cada cenário. Compare alternativas e veja o que acontece se a produtividade ou o preço mudarem."
      />
      <SimuladorClient medias={medias} />
    </>
  );
}
