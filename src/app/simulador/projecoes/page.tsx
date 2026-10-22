import { PageHeader } from "@/components/page-header";
import { ComparadorPlantioClient } from "@/components/comparador-plantio-client";

export const dynamic = "force-dynamic";

export default function ProjecoesPlantioPage() {
  return (
    <>
      <PageHeader
        rotulo="Projeções"
        titulo="Comparar custos × receita do plantio"
        descricao="Compare como plantar — próprio, usina ou terceirizado — e protocolos diferentes. Cada cenário tem seu custo de plantio e produtividade; veja qual dá a melhor margem, não só mais toneladas."
      />
      <ComparadorPlantioClient />
    </>
  );
}