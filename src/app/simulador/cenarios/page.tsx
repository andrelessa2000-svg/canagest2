import { PageHeader } from "@/components/page-header";
import { SimuladorClient } from "@/components/simulador-client";
import { getMediasHistoricas } from "@/lib/simulador-server";

export const dynamic = "force-dynamic";

export default async function SimuladorCenariosPage() {
  const medias = await getMediasHistoricas();

  return (
    <>
      <PageHeader
        rotulo="Ferramentas"
        titulo="Simulador de decisão de plantio"
        descricao="Crie cenários variando área, produtividade, preço e custos. Compare lucro, ROI e veja a sensibilidade a mudanças de produtividade e preço. Os cenários ficam salvos neste aparelho."
      />
      <SimuladorClient medias={medias} />
    </>
  );
}