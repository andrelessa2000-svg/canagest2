import { PageHeader } from "@/components/page-header";
import { Calculadoras } from "@/components/calculadoras";

export const dynamic = "force-dynamic";

export default async function CalculadorasPage() {
  return (
    <>
      <PageHeader
        rotulo="cálculos"
        titulo="Calculadoras"
        descricao="Conversões de área, adubo por tarefa, calda de herbicida e muda de cana."
      />
      <Calculadoras />
    </>
  );
}