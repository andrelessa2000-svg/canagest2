"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";
import {
  colheitaSchema,
  fazendaSchema,
  primeiraMensagem,
  talhaoSchema,
  usinaSchema,
  type ColheitaInput,
} from "./validators";

export type ActionState = { ok: true } | { ok: false; error: string };

function campo(formData: FormData, nome: string): string {
  return formData.get(nome)?.toString() ?? "";
}

function falha(e: unknown): ActionState {
  if (e instanceof Error) {
    return { ok: false, error: e.message };
  }
  return { ok: false, error: "Não foi possível concluir a operação." };
}

export async function criarFazenda(
  prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const parsed = fazendaSchema.safeParse({
    nome: campo(formData, "nome"),
  });

  if (!parsed.success) {
    return { ok: false, error: primeiraMensagem(parsed.error) };
  }

  try {
    await prisma.fazenda.create({
      data: {
        nome: parsed.data.nome,
      },
    });
  } catch (e) {
    console.error(e);
    return falha(e);
  }

  revalidatePath("/");
  revalidatePath("/fazendas");
  redirect("/fazendas");
}

export async function atualizarFazenda(
  id: string,
  prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const parsed = fazendaSchema.safeParse({
    nome: campo(formData, "nome"),
  });

  if (!parsed.success) {
    return { ok: false, error: primeiraMensagem(parsed.error) };
  }

  try {
    await prisma.fazenda.update({
      where: { id },
      data: {
        nome: parsed.data.nome,
      },
    });
  } catch (e) {
    console.error(e);
    return falha(e);
  }

  revalidatePath("/");
  revalidatePath("/fazendas");
  revalidatePath(`/fazendas/${id}`);
  redirect(`/fazendas/${id}`);
}

export async function excluirFazenda(id: string): Promise<void> {
  try {
    await prisma.fazenda.delete({ where: { id } });
  } catch (e) {
    console.error(e);
    throw e;
  }
  revalidatePath("/");
  revalidatePath("/fazendas");
  redirect("/fazendas");
}

export async function criarTalhao(
  fazendaId: string,
  prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const parsed = talhaoSchema.safeParse({
    fazendaId,
    nome: campo(formData, "nome"),
    area: campo(formData, "area"),
    unidade: campo(formData, "unidade"),
  });

  if (!parsed.success) {
    return { ok: false, error: primeiraMensagem(parsed.error) };
  }

  let talhaoId: string;
  try {
    const talhao = await prisma.talhao.create({
      data: {
        fazendaId,
        nome: parsed.data.nome,
        areaHa: parsed.data.areaHa,
      },
    });
    talhaoId = talhao.id;
  } catch (e) {
    console.error(e);
    return falha(e);
  }

  revalidatePath("/");
  revalidatePath("/fazendas");
  revalidatePath(`/fazendas/${fazendaId}`);
  redirect(`/talhoes/${talhaoId}`);
}

export async function atualizarTalhao(
  id: string,
  prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const original = await prisma.talhao.findUnique({ where: { id } });
  if (!original) {
    return { ok: false, error: "Talhão não encontrado." };
  }

  const parsed = talhaoSchema.safeParse({
    fazendaId: original.fazendaId,
    nome: campo(formData, "nome"),
    area: campo(formData, "area"),
    unidade: campo(formData, "unidade"),
  });

  if (!parsed.success) {
    return { ok: false, error: primeiraMensagem(parsed.error) };
  }

  try {
    await prisma.talhao.update({
      where: { id },
      data: {
        nome: parsed.data.nome,
        areaHa: parsed.data.areaHa,
      },
    });
  } catch (e) {
    console.error(e);
    return falha(e);
  }

  revalidatePath("/");
  revalidatePath(`/fazendas/${original.fazendaId}`);
  revalidatePath(`/talhoes/${id}`);
  redirect(`/talhoes/${id}`);
}

export async function excluirTalhao(id: string): Promise<void> {
  let fazendaId: string;
  try {
    const talhao = await prisma.talhao.findUnique({ where: { id } });
    if (!talhao) {
      throw new Error("Talhão não encontrado.");
    }
    fazendaId = talhao.fazendaId;
    await prisma.talhao.delete({ where: { id } });
  } catch (e) {
    console.error(e);
    throw e;
  }
  revalidatePath("/");
  revalidatePath("/fazendas");
  revalidatePath(`/fazendas/${fazendaId}`);
  redirect(`/fazendas/${fazendaId}`);
}

export async function criarUsina(
  prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const parsed = usinaSchema.safeParse({
    nome: campo(formData, "nome"),
    modelo: campo(formData, "modelo"),
  });

  if (!parsed.success) {
    return { ok: false, error: primeiraMensagem(parsed.error) };
  }

  try {
    await prisma.usina.create({
      data: {
        nome: parsed.data.nome,
        modelo: parsed.data.modelo,
      },
    });
  } catch (e) {
    console.error(e);
    return falha(e);
  }

  revalidatePath("/");
  revalidatePath("/usinas");
  redirect("/usinas");
}

export async function atualizarUsina(
  id: string,
  prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const parsed = usinaSchema.safeParse({
    nome: campo(formData, "nome"),
    modelo: campo(formData, "modelo"),
  });

  if (!parsed.success) {
    return { ok: false, error: primeiraMensagem(parsed.error) };
  }

  try {
    await prisma.usina.update({
      where: { id },
      data: {
        nome: parsed.data.nome,
        modelo: parsed.data.modelo,
      },
    });
  } catch (e) {
    console.error(e);
    return falha(e);
  }

  revalidatePath("/");
  revalidatePath("/usinas");
  redirect("/usinas");
}

export async function excluirUsina(id: string): Promise<ActionState> {
  try {
    await prisma.usina.delete({ where: { id } });
  } catch (e) {
    console.error(e);
    return falha(e);
  }
  revalidatePath("/");
  revalidatePath("/usinas");
  return { ok: true };
}

function camposColheita(formData: FormData) {
  return {
    fazendaId: campo(formData, "fazendaId"),
    talhaoId: campo(formData, "talhaoId") || undefined,
    usinaId: campo(formData, "usinaId"),
    data: campo(formData, "data"),
    tipo: campo(formData, "tipo"),
    toneladas: campo(formData, "toneladas"),
    precoCana: campo(formData, "precoCana"),
    agio: campo(formData, "agio"),
    atrPorTonelada: campo(formData, "atrPorTonelada"),
    precoKgAtr: campo(formData, "precoKgAtr"),
    ctc: campo(formData, "ctc"),
    areaColhida: campo(formData, "areaColhida"),
    arrendar: campo(formData, "arrendar"),
    tonsPorTarefa: campo(formData, "tonsPorTarefa"),
    tarefasArrendadas: campo(formData, "tarefasArrendadas"),
    adubo: campo(formData, "adubo"),
    precoTonAdubo: campo(formData, "precoTonAdubo"),
    tarefasAdubo: campo(formData, "tarefasAdubo"),
    herbicidas: campo(formData, "herbicidas"),
    insumos: campo(formData, "insumos"),
    despesasUsina: campo(formData, "despesasUsina"),
    observacao: campo(formData, "observacao"),
  };
}

function validarRemuneracao(
  modelo: string,
  d: ColheitaInput,
): string | null {
  if (modelo === "coruripe") {
    if (d.atrPorTonelada === null) {
      return "Informe o ATR por tonelada (kg ATR/t).";
    }
    if (d.precoKgAtr === null && d.precoCana === null) {
      return "Informe o preço do kg de ATR (ou um preço base por tonelada).";
    }
    return null;
  }
  if (d.precoCana === null) {
    return "Informe o preço da cana (R$/t).";
  }
  return null;
}

function dadosColheita(d: ColheitaInput) {
  return {
    fazendaId: d.fazendaId,
    talhaoId: d.talhaoId || null,
    usinaId: d.usinaId,
    data: new Date(`${d.data}T12:00:00`),
    tipo: d.tipo,
    toneladas: d.toneladas,
    precoCana: d.precoCana,
    agio: d.agio,
    atrPorTonelada: d.atrPorTonelada,
    precoKgAtr: d.precoKgAtr,
ctc: d.ctc,
    areaColhida: d.areaColhida,
    arrendar: d.arrendar,
    tonsPorTarefa: d.tonsPorTarefa,
    tarefasArrendadas: d.tarefasArrendadas,
    adubo: d.adubo,
    precoTonAdubo: d.precoTonAdubo,
    tarefasAdubo: d.tarefasAdubo,
    herbicidas: d.herbicidas as unknown as Prisma.InputJsonValue,
    insumos: d.insumos as unknown as Prisma.InputJsonValue,
    despesasUsina: d.despesasUsina as unknown as Prisma.InputJsonValue,
    observacao: d.observacao,
  };
}

async function validarUsina(
  usinaId: string,
  d: ColheitaInput,
): Promise<string | null> {
  const usina = await prisma.usina.findUnique({
    where: { id: usinaId },
    select: { modelo: true },
  });
  if (!usina) return "Usina não encontrada.";
  return validarRemuneracao(usina.modelo, d);
}

export async function criarColheita(
  prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const parsed = colheitaSchema.safeParse(camposColheita(formData));

  if (!parsed.success) {
    return { ok: false, error: primeiraMensagem(parsed.error) };
  }

  const erroUsina = await validarUsina(parsed.data.usinaId, parsed.data);
  if (erroUsina) {
    return { ok: false, error: erroUsina };
  }

  let criada!: { id: string; fazendaId: string; talhaoId: string | null };
  try {
    const c = await prisma.colheita.create({
      data: dadosColheita(parsed.data),
    });
    criada = { id: c.id, fazendaId: c.fazendaId, talhaoId: c.talhaoId };
  } catch (e) {
    console.error(e);
    return falha(e);
  }

  revalidatePath("/");
  revalidatePath("/colheitas");
  revalidatePath(`/fazendas/${criada.fazendaId}`);
  if (criada.talhaoId) {
    revalidatePath(`/talhoes/${criada.talhaoId}`);
  }
  redirect(`/colheitas/${criada.id}`);
}

export async function atualizarColheita(
  id: string,
  prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const parsed = colheitaSchema.safeParse(camposColheita(formData));

  if (!parsed.success) {
    return { ok: false, error: primeiraMensagem(parsed.error) };
  }

  const erroUsina = await validarUsina(parsed.data.usinaId, parsed.data);
  if (erroUsina) {
    return { ok: false, error: erroUsina };
  }

  try {
    const c = await prisma.colheita.update({
      where: { id },
      data: dadosColheita(parsed.data),
    });
    revalidatePath("/");
    revalidatePath("/colheitas");
    revalidatePath(`/colheitas/${id}`);
    revalidatePath(`/fazendas/${c.fazendaId}`);
    if (c.talhaoId) {
      revalidatePath(`/talhoes/${c.talhaoId}`);
    }
  } catch (e) {
    console.error(e);
    return falha(e);
  }

  redirect(`/colheitas/${id}`);
}

export async function excluirColheita(id: string): Promise<ActionState> {
  try {
    await removerColheita(id);
  } catch (e) {
    console.error(e);
    return falha(e);
  }
  return { ok: true };
}

export async function excluirColheitaRedirecionando(id: string): Promise<void> {
  await removerColheita(id);
  redirect("/colheitas");
}

async function removerColheita(id: string): Promise<void> {
  await prisma.colheita.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/colheitas");
  revalidatePath("/talhoes", "layout");
  revalidatePath("/fazendas", "layout");
}