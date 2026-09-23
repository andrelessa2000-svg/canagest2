import { cargarCascata, filaCascataCSV } from "@/lib/relatorio";

export const dynamic = "force-dynamic";

export async function GET() {
  const { filas, total } = await cargarCascata();

  const cabecera = [
    "Fazenda",
    "Toneladas",
    "Tarefas",
    "Receita",
    "CTC",
    "Arrendamento",
    "Insumos",
    "Desp. usina",
    "Lucro bruto",
    "Tratos",
    "Lucro neto",
    "Plantio",
  ].join(";");

  const filasCSV = [cabecera, ...filas.map(filaCascataCSV), filaCascataCSV(total)].join("\r\n");

  const bom = "\uFEFF";

  return new Response(bom + filasCSV, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="relatorio-cascata.csv"`,
    },
  });
}