import { NextResponse } from "next/server";
import { getMediasHistoricas } from "@/lib/simulador-server";

export async function GET() {
  try {
    const medias = await getMediasHistoricas();
    return NextResponse.json(medias);
  } catch (e) {
    console.error("Erro ao calcular médias:", e);
    return NextResponse.json({ error: "Erro ao calcular médias" }, { status: 500 });
  }
}