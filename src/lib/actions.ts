"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";
import { haParaTarefas, parseDecimal } from "./format";
import { userIdAtual } from "./auth";
import { MESES } from "./historico-preco";
import { MENSAGEM_SAFRA_INVALIDA, normalizarSafra } from "./safra";
import { normalizarSafrasDoUsuario } from "./safras-usuario";
import { z } from "zod";
import {
  colheitaSchema,
  custoColheitaSchema,
  fazendaSchema,
  historicoPrecoSchema,
  plantioSchema,
  primeiraMensagem,
  proprietarioSchema,
  talhaoSchema,
  tratoSchema,
  usinaSchema,
  type ColheitaInput,
  type PlantioInput,
  type TratoInput,
} from "./validators";

export type ActionState = { ok: true; mensagem?: string } | { ok: false; error: string };

async function usuarioId(): Promise<string> {
  const id = await userIdAtual();
  if (!id) throw new Error("Não autenticado");
  return id;
}

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
    ativa: campo(formData, "ativa"),
    proprietarioId: campo(formData, "proprietarioId"),
  });

  if (!parsed.success) {
    return { ok: false, error: primeiraMensagem(parsed.error) };
  }

  try {
    await prisma.fazenda.create({
      data: {
        userId: await usuarioId(),
        nome: parsed.data.nome,
        ativa: parsed.data.ativa,
        proprietarioId: parsed.data.proprietarioId,
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
    ativa: campo(formData, "ativa"),
    proprietarioId: campo(formData, "proprietarioId"),
  });

  if (!parsed.success) {
    return { ok: false, error: primeiraMensagem(parsed.error) };
  }

  try {
    await prisma.fazenda.update({
      where: { id, userId: await usuarioId() },
      data: {
        nome: parsed.data.nome,
        ativa: parsed.data.ativa,
        proprietarioId: parsed.data.proprietarioId,
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
    await prisma.fazenda.delete({ where: { id, userId: await usuarioId() } });
  } catch (e) {
    console.error(e);
    throw e;
  }
  revalidatePath("/");
  revalidatePath("/fazendas");
  redirect("/fazendas");
}

export async function definirProprietario(
  fazendaId: string,
  prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const valor = campo(formData, "proprietarioId");
  const donoId = valor === "" ? null : valor;

  if (donoId) {
    const dono = await prisma.proprietario.findFirst({
      where: { id: donoId, userId: await usuarioId() },
    });
    if (!dono) {
      return { ok: false, error: "Proprietário não encontrado." };
    }
  }

  try {
    await prisma.fazenda.update({
      where: { id: fazendaId, userId: await usuarioId() },
      data: { proprietarioId: donoId },
    });
  } catch (e) {
    console.error(e);
    return falha(e);
  }

  revalidatePath("/fazendas");
  revalidatePath(`/fazendas/${fazendaId}`);
  return { ok: true };
}

export async function criarProprietario(
  prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const parsed = proprietarioSchema.safeParse({ nome: campo(formData, "nome") });

  if (!parsed.success) {
    return { ok: false, error: primeiraMensagem(parsed.error) };
  }

  try {
    await prisma.proprietario.create({
      data: { userId: await usuarioId(), nome: parsed.data.nome },
    });
  } catch (e) {
    console.error(e);
    return falha(e);
  }

  revalidatePath("/proprietarios");
  revalidatePath("/fazendas");
  return { ok: true };
}

export async function atualizarProprietario(
  id: string,
  prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const parsed = proprietarioSchema.safeParse({ nome: campo(formData, "nome") });

  if (!parsed.success) {
    return { ok: false, error: primeiraMensagem(parsed.error) };
  }

  try {
    await prisma.proprietario.update({
      where: { id, userId: await usuarioId() },
      data: { nome: parsed.data.nome },
    });
  } catch (e) {
    console.error(e);
    return falha(e);
  }

  revalidatePath("/proprietarios");
  revalidatePath("/fazendas");
  return { ok: true };
}

export async function excluirProprietario(id: string): Promise<void> {
  try {
    await prisma.proprietario.delete({ where: { id, userId: await usuarioId() } });
  } catch (e) {
    console.error(e);
    throw e;
  }
  revalidatePath("/proprietarios");
  revalidatePath("/fazendas");
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

  try {
    await prisma.talhao.create({
      data: {
        userId: await usuarioId(),
        fazendaId,
        nome: parsed.data.nome,
        areaHa: parsed.data.areaHa,
      },
    });
  } catch (e) {
    console.error(e);
    return falha(e);
  }

  revalidatePath("/");
  revalidatePath("/fazendas");
  revalidatePath(`/fazendas/${fazendaId}`);
  redirect(`/fazendas/${fazendaId}/talhoes/novo`);
}

export async function atualizarTalhao(
  id: string,
  prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const original = await prisma.talhao.findUnique({
    where: { id, userId: await usuarioId() },
  });
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
      where: { id, userId: await usuarioId() },
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
    const talhao = await prisma.talhao.findUnique({
      where: { id, userId: await usuarioId() },
    });
    if (!talhao) {
      throw new Error("Talhão não encontrado.");
    }
    fazendaId = talhao.fazendaId;
    await prisma.talhao.delete({ where: { id, userId: talhao.userId } });
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
        userId: await usuarioId(),
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
      where: { id, userId: await usuarioId() },
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
    await prisma.usina.delete({ where: { id, userId: await usuarioId() } });
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
    usinaId: campo(formData, "usinaId"),
    data: campo(formData, "data"),
    tipo: campo(formData, "tipo"),
    safra: campo(formData, "safra"),
    projecao: campo(formData, "projecao"),
    talhoesColhidos: campo(formData, "talhoesColhidos"),
    toneladas: campo(formData, "toneladas"),
    precoCana: campo(formData, "precoCana"),
    agio: campo(formData, "agio"),
    atrPorTonelada: campo(formData, "atrPorTonelada"),
    precoKgAtr: campo(formData, "precoKgAtr"),
    talhaoId: campo(formData, "talhaoId"),
    talhoesIds: campo(formData, "talhoesIds"),
    alocacoes: campo(formData, "alocacoes"),
    escopo: campo(formData, "escopo"),
    areaColhida: campo(formData, "areaColhida"),
    observacao: campo(formData, "observacao"),
  };
}

function camposCustoColheita(formData: FormData) {
  return {
    ctc: campo(formData, "ctc"),
    arrendar: campo(formData, "arrendar"),
    tonsPorTarefa: campo(formData, "tonsPorTarefa"),
    tarefasArrendadas: campo(formData, "tarefasArrendadas"),
    dividas: campo(formData, "dividas"),
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
    usinaId: d.usinaId,
    data: new Date(`${d.data}T12:00:00`),
    tipo: d.tipo,
    safra: d.safra,
    projecao: d.projecao,
    talhoesColhidos: d.talhoesColhidos as unknown as Prisma.InputJsonValue,
    toneladas: d.toneladas,
    precoCana: d.precoCana,
    agio: d.agio,
    atrPorTonelada: d.atrPorTonelada,
    precoKgAtr: d.precoKgAtr,
    talhaoId: d.talhaoId || null,
    talhoesIds: d.talhoesIds as unknown as Prisma.InputJsonValue,
    alocacoes: d.alocacoes as unknown as Prisma.InputJsonValue,
    escopo: d.escopo,
    areaColhida: d.areaColhida,
    observacao: d.observacao,
  };
}

function dadosCustoColheita(d: z.infer<typeof custoColheitaSchema>) {
  return {
    ctc: d.ctc,
    arrendar: d.arrendar,
    tonsPorTarefa: d.tonsPorTarefa,
    tarefasArrendadas: d.tarefasArrendadas,
    dividas:
      d.dividas && d.dividas.length > 0
        ? (d.dividas as unknown as Prisma.InputJsonValue)
        : Prisma.DbNull,
  };
}

async function validarUsina(
  usinaId: string,
  d: ColheitaInput,
): Promise<string | null> {
  const usina = await prisma.usina.findUnique({
    where: { id: usinaId, userId: await usuarioId() },
    select: { modelo: true },
  });
  if (!usina) return "Usina não encontrada.";
  return validarRemuneracao(usina.modelo, d);
}

export async function criarColheita(
  prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const parsedColheita = colheitaSchema.safeParse(camposColheita(formData));
  const parsedCusto = custoColheitaSchema.safeParse(camposCustoColheita(formData));

  if (!parsedColheita.success) {
    return { ok: false, error: primeiraMensagem(parsedColheita.error) };
  }
  if (!parsedCusto.success) {
    return { ok: false, error: primeiraMensagem(parsedCusto.error) };
  }

  const erroUsina = await validarUsina(parsedColheita.data.usinaId, parsedColheita.data);
  if (erroUsina) {
    return { ok: false, error: erroUsina };
  }

  let redirecionar = "/colheitas";
  try {
    if (parsedColheita.data.escopo === "proprietario") {
      const resultado = await colheitasPorProprietario(
        parsedColheita.data,
        parsedCusto.data,
        campo(formData, "fazendasIds"),
      );
      if (!resultado.ok) {
        return { ok: false, error: resultado.error };
      }
      redirecionar = "/colheitas";
    } else {
      const criada = await prisma.$transaction(async (tx) => {
        const c = await tx.colheita.create({
          data: { userId: await usuarioId(), ...dadosColheita(parsedColheita.data) },
        });
        await tx.custoColheita.create({
          data: {
            colheitaId: c.id,
            ...dadosCustoColheita(parsedCusto.data),
          },
        });
        return { id: c.id, fazendaId: c.fazendaId };
      });
      redirecionar = `/colheitas/${criada.id}`;
      revalidatePath(`/fazendas/${criada.fazendaId}`);
    }
  } catch (e) {
    console.error(e);
    return falha(e);
  }

  revalidatePath("/");
  revalidatePath("/colheitas");
  redirect(redirecionar);
}

export async function atualizarColheita(
  id: string,
  prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const bruto = camposColheita(formData);
  // Edição é sempre de um registro por fazenda; escopo por dono não se divide aqui.
  if (bruto.escopo === "proprietario") {
    bruto.escopo = "fazenda";
  }
  const parsedColheita = colheitaSchema.safeParse(bruto);
  const parsedCusto = custoColheitaSchema.safeParse(camposCustoColheita(formData));

  if (!parsedColheita.success) {
    return { ok: false, error: primeiraMensagem(parsedColheita.error) };
  }
  if (!parsedCusto.success) {
    return { ok: false, error: primeiraMensagem(parsedCusto.error) };
  }

  const erroUsina = await validarUsina(parsedColheita.data.usinaId, parsedColheita.data);
  if (erroUsina) {
    return { ok: false, error: erroUsina };
  }

  try {
    const c = await prisma.colheita.update({
      where: { id, userId: await usuarioId() },
      data: dadosColheita(parsedColheita.data),
    });
    await prisma.custoColheita.upsert({
      where: { colheitaId: id },
      update: dadosCustoColheita(parsedCusto.data),
      create: {
        colheitaId: id,
        ...dadosCustoColheita(parsedCusto.data),
      },
    });
    revalidatePath("/");
    revalidatePath("/colheitas");
    revalidatePath(`/colheitas/${id}`);
    revalidatePath(`/fazendas/${c.fazendaId}`);
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
  await prisma.colheita.delete({ where: { id, userId: await usuarioId() } });
  revalidatePath("/");
  revalidatePath("/colheitas");
  revalidatePath("/talhoes", "layout");
  revalidatePath("/fazendas", "layout");
}

export async function concretizarColheita(id: string): Promise<void> {
  try {
    await prisma.colheita.update({
      where: { id, userId: await usuarioId() },
      data: { projecao: false },
    });
  } catch (e) {
    console.error(e);
    throw e;
  }
  revalidatePath("/");
  revalidatePath("/colheitas");
  redirect("/colheitas");
}

function camposPlantio(formData: FormData) {
  return {
    fazendaId: campo(formData, "fazendaId"),
    talhaoId: campo(formData, "talhaoId") || undefined,
    talhoesIds: campo(formData, "talhoesIds"),
    alocacoes: campo(formData, "alocacoes"),
    insumos: campo(formData, "insumos"),
    escopo: campo(formData, "escopo"),
    tarefas: campo(formData, "tarefas"),
    safra: campo(formData, "safra"),
    tipo: campo(formData, "tipo"),
    data: campo(formData, "data"),
    valor: campo(formData, "valor"),
    projecao: campo(formData, "projecao"),
    areaHa: campo(formData, "areaHa"),
    observacao: campo(formData, "observacao"),
  };
}

function dadosPlantio(d: PlantioInput) {
  const escopoTalhoes = d.escopo === "talhao" || d.escopo === "parte";
  return {
    fazendaId: d.fazendaId,
    talhaoId: escopoTalhoes ? (d.alocacoes[0]?.talhaoId ?? d.talhaoId ?? null) : d.talhaoId ?? null,
    talhoesIds: d.talhoesIds as unknown as Prisma.InputJsonValue,
    alocacoes: escopoTalhoes && d.alocacoes.length > 0
      ? (d.alocacoes as unknown as Prisma.InputJsonValue)
      : undefined,
    insumos: d.insumos.length > 0 ? (d.insumos as unknown as Prisma.InputJsonValue) : undefined,
    escopo: d.escopo,
    tarefas: d.tarefas,
    safra: d.safra,
    tipo: d.tipo,
    data: new Date(`${d.data}T12:00:00`),
    valor: d.valor,
    projecao: d.projecao,
    areaHa: d.areaHa,
    observacao: d.observacao,
  };
}

export async function criarPlantio(
  prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const parsed = plantioSchema.safeParse(camposPlantio(formData));
  if (!parsed.success) {
    return { ok: false, error: primeiraMensagem(parsed.error) };
  }
  try {
    if (parsed.data.escopo === "proprietario") {
      const resultado = await plantiosPorProprietario(
        parsed.data,
        campo(formData, "fazendasIds"),
      );
      if (!resultado.ok) {
        return { ok: false, error: resultado.error };
      }
    } else {
      await prisma.plantio.create({
        data: { userId: await usuarioId(), ...dadosPlantio(parsed.data) },
      });
    }
  } catch (e) {
    console.error(e);
    return falha(e);
  }
  revalidatePath("/");
  revalidatePath("/plantio");
  revalidatePath(`/fazendas/${parsed.data.fazendaId}`);
  redirect("/plantio");
}

export async function atualizarPlantio(
  id: string,
  prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const bruto = camposPlantio(formData);
  // Edição é sempre de um registro por fazenda; escopo por dono não se divide aqui.
  if (bruto.escopo === "proprietario") {
    bruto.escopo = "fazenda";
  }
  const parsed = plantioSchema.safeParse(bruto);
  if (!parsed.success) {
    return { ok: false, error: primeiraMensagem(parsed.error) };
  }
  try {
    await prisma.plantio.update({
      where: { id, userId: await usuarioId() },
      data: dadosPlantio(parsed.data),
    });
  } catch (e) {
    console.error(e);
    return falha(e);
  }
  revalidatePath("/");
  revalidatePath("/plantio");
  revalidatePath(`/fazendas/${parsed.data.fazendaId}`);
  redirect("/plantio");
}

export async function excluirPlantio(id: string): Promise<ActionState> {
  try {
    await prisma.plantio.delete({ where: { id, userId: await usuarioId() } });
  } catch (e) {
    console.error(e);
    return falha(e);
  }
  revalidatePath("/");
  revalidatePath("/plantio");
  revalidatePath("/fazendas", "layout");
  return { ok: true };
}

function camposTrato(formData: FormData) {
  return {
    fazendaId: campo(formData, "fazendaId"),
    talhaoId: campo(formData, "talhaoId") || undefined,
    talhoesIds: campo(formData, "talhoesIds"),
    alocacoes: campo(formData, "alocacoes"),
    insumos: campo(formData, "insumos"),
    safra: campo(formData, "safra"),
    tipo: campo(formData, "tipo"),
    escopo: campo(formData, "escopo"),
    tarefas: campo(formData, "tarefas"),
    data: campo(formData, "data"),
    valor: campo(formData, "valor"),
    projecao: campo(formData, "projecao"),
    produtos: campo(formData, "produtos"),
    observacao: campo(formData, "observacao"),
  };
}

function dadosTrato(d: TratoInput) {
  const escopoTalhoes = d.escopo === "talhao" || d.escopo === "parte";
  return {
    fazendaId: d.fazendaId,
    talhaoId: escopoTalhoes ? (d.alocacoes[0]?.talhaoId ?? d.talhaoId ?? null) : d.talhaoId ?? null,
    talhoesIds: d.talhoesIds as unknown as Prisma.InputJsonValue,
    alocacoes: escopoTalhoes && d.alocacoes.length > 0
      ? (d.alocacoes as unknown as Prisma.InputJsonValue)
      : undefined,
    insumos: d.insumos.length > 0 ? (d.insumos as unknown as Prisma.InputJsonValue) : undefined,
    safra: d.safra,
    tipo: d.tipo,
    escopo: d.escopo,
    tarefas: d.tarefas,
    data: new Date(`${d.data}T12:00:00`),
    valor: d.valor,
    projecao: d.projecao,
    produtos: d.produtos as unknown as Prisma.InputJsonValue,
    observacao: d.observacao,
  };
}

// Escopo "proprietario": um registro para várias fazendas do mesmo dono.
// Valida a seleção e calcula o rateio (share) pela área em tarefas de cada fazenda.
type RateioFazendas =
  | { ok: false; error: string }
  | {
      ok: true;
      totalTarefas: number;
      porFazenda: {
        fazendaId: string;
        donoNome: string | null;
        tarefas: number;
        share: number;
      }[];
    };

async function fazendasRateio(fazendasIdsJson: string): Promise<RateioFazendas> {
  let ids: string[];
  try {
    const parsedIds: unknown = JSON.parse(fazendasIdsJson || "[]");
    ids = Array.isArray(parsedIds) ? parsedIds.filter((x): x is string => typeof x === "string") : [];
  } catch {
    ids = [];
  }
  if (ids.length === 0) {
    return { ok: false, error: "Marque ao menos uma fazenda." };
  }
  if (new Set(ids).size !== ids.length) {
    return { ok: false, error: "Há fazendas repetidas na seleção." };
  }

  const farms = await prisma.fazenda.findMany({
    where: { userId: await usuarioId(), id: { in: ids } },
    select: {
      id: true,
      nome: true,
      proprietario: { select: { nome: true } },
      talhoes: { select: { areaHa: true } },
    },
  });
  if (farms.length !== ids.length) {
    return { ok: false, error: "Alguma fazenda selecionada não existe." };
  }

  const porFazenda = farms.map((f) => ({
    fazendaId: f.id,
    donoNome: f.proprietario?.nome ?? null,
    tarefas: Math.round(haParaTarefas(f.talhoes.reduce((a, t) => a + t.areaHa, 0)) * 100) / 100,
  }));
  const totalTarefas = porFazenda.reduce((a, x) => a + x.tarefas, 0);
  if (totalTarefas <= 0) {
    return { ok: false, error: "As fazendas escolhidas não têm talhões cadastrados (área zero)." };
  }

  return {
    ok: true,
    totalTarefas,
    porFazenda: porFazenda.map((x) => ({ ...x, share: x.tarefas / totalTarefas })),
  };
}

function arred(x: number) {
  return Math.round(x * 100) / 100;
}

function obsDoDono(donoNome: string | null, observacao: string | undefined) {
  if (!donoNome) return observacao || undefined;
  const prefixo = `Dono ${donoNome}`;
  return observacao ? `${prefixo} — ${observacao}` : prefixo;
}

// Divide um trato por proprietário em um registro por fazenda (área/valor/produtos proporcionais).
async function tratosPorProprietario(
  d: TratoInput,
  fazendasIdsJson: string,
): Promise<{ ok: false; error: string } | { ok: true; count: number }> {
  const rateio = await fazendasRateio(fazendasIdsJson);
  if (!rateio.ok) return rateio;

  const data = new Date(`${d.data}T12:00:00`);
  const userId = await usuarioId();

  const dados = rateio.porFazenda.map((x) => ({
    userId,
    fazendaId: x.fazendaId,
    talhaoId: null,
    safra: d.safra,
    tipo: d.tipo,
    escopo: "fazenda",
    tarefas: x.tarefas,
    data,
    valor: arred(d.valor * x.share),
    projecao: d.projecao,
    produtos: d.produtos.map((p) => {
      const q = typeof p.quantidade === "number" ? p.quantidade : 0;
      return { ...p, quantidade: arred(q * x.share) };
    }),
    observacao: obsDoDono(x.donoNome, d.observacao),
  }));

  await prisma.trato.createMany({ data: dados });
  return { ok: true, count: dados.length };
}

// Divide um plantio por proprietário: área/tarefas/valor/insumos proporcionais por fazenda.
async function plantiosPorProprietario(
  d: PlantioInput,
  fazendasIdsJson: string,
): Promise<{ ok: false; error: string } | { ok: true; count: number }> {
  const rateio = await fazendasRateio(fazendasIdsJson);
  if (!rateio.ok) return rateio;

  const data = new Date(`${d.data}T12:00:00`);
  const userId = await usuarioId();

  // Área (ha) de cada fazenda — para a coluna areaHa e o rateio dos insumos por share.
  const areasHa = await prisma.fazenda.findMany({
    where: { userId, id: { in: rateio.porFazenda.map((x) => x.fazendaId) } },
    select: { id: true, talhoes: { select: { areaHa: true } } },
  });
  const areaHaPor = new Map(areasHa.map((f) => [f.id, f.talhoes.reduce((a, t) => a + t.areaHa, 0)]));

  const dados = rateio.porFazenda.map((x) => ({
    userId,
    fazendaId: x.fazendaId,
    talhaoId: null,
    safra: d.safra,
    tipo: d.tipo,
    escopo: "fazenda",
    tarefas: x.tarefas,
    data,
    valor: arred(d.valor * x.share),
    projecao: d.projecao,
    areaHa: arred(areaHaPor.get(x.fazendaId) ?? 0),
    insumos: d.insumos.map((i) => ({ ...i, quantidade: arred(i.quantidade * x.share) })),
    observacao: obsDoDono(x.donoNome, d.observacao),
  }));

  await prisma.plantio.createMany({ data: dados });
  return { ok: true, count: dados.length };
}

// Divide uma colheita por proprietário: toneladas/área/valores proporcionais; preços (R$/t, ATR) permanecem.
async function colheitasPorProprietario(
  d: ColheitaInput,
  custo: z.infer<typeof custoColheitaSchema>,
  fazendasIdsJson: string,
): Promise<{ ok: false; error: string } | { ok: true; count: number }> {
  const rateio = await fazendasRateio(fazendasIdsJson);
  if (!rateio.ok) return rateio;

  const data = new Date(`${d.data}T12:00:00`);
  const userId = await usuarioId();

  await prisma.$transaction(
    rateio.porFazenda.map((x) =>
      prisma.colheita.create({
        data: {
          userId,
          fazendaId: x.fazendaId,
          usinaId: d.usinaId,
          data,
          tipo: d.tipo,
          safra: d.safra,
          projecao: d.projecao,
          talhoesColhidos: [],
          toneladas: arred(d.toneladas * x.share),
          precoCana: d.precoCana,
          agio: d.agio,
          atrPorTonelada: d.atrPorTonelada,
          precoKgAtr: d.precoKgAtr,
          talhaoId: null,
          talhoesIds: [],
          alocacoes: [],
          escopo: "fazenda",
          areaColhida: d.areaColhida !== null ? arred(d.areaColhida * x.share) : null,
          observacao: obsDoDono(x.donoNome, d.observacao),
          custo: {
            create: {
              ctc: arred(custo.ctc * x.share),
              arrendar: custo.arrendar,
              tonsPorTarefa: custo.tonsPorTarefa,
              tarefasArrendadas:
                custo.tarefasArrendadas !== null
                  ? arred(custo.tarefasArrendadas * x.share)
                  : null,
              dividas:
                custo.dividas && custo.dividas.length > 0
                  ? (custo.dividas.map((i) => ({
                      ...i,
                      valorTotal: arred(i.valorTotal * x.share),
                    })) as unknown as Prisma.InputJsonValue)
                  : Prisma.DbNull,
            },
          },
        },
      }),
    ),
  );
  return { ok: true, count: rateio.porFazenda.length };
}

export async function criarTrato(
  prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const parsed = tratoSchema.safeParse(camposTrato(formData));
  if (!parsed.success) {
    return { ok: false, error: primeiraMensagem(parsed.error) };
  }
  try {
    if (parsed.data.escopo === "proprietario") {
      const resultado = await tratosPorProprietario(
        parsed.data,
        campo(formData, "fazendasIds"),
      );
      if (!resultado.ok) {
        return { ok: false, error: resultado.error };
      }
    } else {
      await prisma.trato.create({
        data: { userId: await usuarioId(), ...dadosTrato(parsed.data) },
      });
    }
  } catch (e) {
    console.error(e);
    return falha(e);
  }
  revalidatePath("/");
  revalidatePath("/tratos");
  revalidatePath(`/fazendas/${parsed.data.fazendaId}`);
  redirect("/tratos");
}

export async function atualizarTrato(
  id: string,
  prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const bruto = camposTrato(formData);
  // Edição é sempre de um registro por fazenda; escopo por dono não se divide aqui.
  if (bruto.escopo === "proprietario") {
    bruto.escopo = "fazenda";
  }
  const parsed = tratoSchema.safeParse(bruto);
  if (!parsed.success) {
    return { ok: false, error: primeiraMensagem(parsed.error) };
  }
  try {
    await prisma.trato.update({
      where: { id, userId: await usuarioId() },
      data: dadosTrato(parsed.data),
    });
  } catch (e) {
    console.error(e);
    return falha(e);
  }
  revalidatePath("/");
  revalidatePath("/tratos");
  revalidatePath(`/fazendas/${parsed.data.fazendaId}`);
  redirect("/tratos");
}

export async function excluirTrato(id: string): Promise<ActionState> {
  try {
    await prisma.trato.delete({ where: { id, userId: await usuarioId() } });
  } catch (e) {
    console.error(e);
    return falha(e);
  }
  revalidatePath("/");
  revalidatePath("/tratos");
  revalidatePath("/fazendas", "layout");
  return { ok: true };
}

export async function concretizarPlantio(id: string): Promise<void> {
  try {
    await prisma.plantio.update({
      where: { id, userId: await usuarioId() },
      data: { projecao: false },
    });
  } catch (e) {
    console.error(e);
    throw e;
  }
  revalidatePath("/");
  revalidatePath("/plantio");
  redirect("/plantio");
}

export async function concretizarTrato(id: string): Promise<void> {
  try {
    await prisma.trato.update({
      where: { id, userId: await usuarioId() },
      data: { projecao: false },
    });
  } catch (e) {
    console.error(e);
    throw e;
  }
  revalidatePath("/");
  revalidatePath("/tratos");
  redirect("/tratos");
}

export async function criarInvestimento(
  prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const fazendaId = campo(formData, "fazendaId");
  const safraBruta = campo(formData, "safra");
  const nome = campo(formData, "nome");
  const valor = formData.get("valor")?.toString() ?? "";
  const data = campo(formData, "data");
  const observacao = campo(formData, "observacao");

  if (!fazendaId) return { ok: false, error: "Selecione a fazenda." };
  if (nome.length < 2) return { ok: false, error: "Informe o nome da inversão." };
  const valorNum = parseDecimal(valor);
  if (Number.isNaN(valorNum) || valorNum < 0) {
    return { ok: false, error: "Valor inválido." };
  }
  const safra = normalizarSafra(safraBruta);
  if (safraBruta && !safra) return { ok: false, error: MENSAGEM_SAFRA_INVALIDA };

  try {
    await prisma.investimento.create({
      data: {
        userId: await usuarioId(),
        fazendaId,
        safra: safra || null,
        nome,
        valor: valorNum,
        data: data ? new Date(`${data}T12:00:00`) : new Date(),
        observacao: observacao || null,
      },
    });
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Não foi possível registrar a inversão." };
  }

  revalidatePath("/");
  revalidatePath("/financeiro");
  redirect("/financeiro");
}

export async function excluirInvestimento(id: string): Promise<ActionState> {
  try {
    await prisma.investimento.delete({
      where: { id, userId: await usuarioId() },
    });
  } catch (e) {
    console.error(e);
    return falha(e);
  }
  revalidatePath("/");
  revalidatePath("/financeiro");
  return { ok: true };
}

export async function corrigirSafrasAntigas(): Promise<ActionState> {
  try {
    const r = await normalizarSafrasDoUsuario();
    revalidatePath("/");
    revalidatePath("/relatorios");
    revalidatePath("/relatorios/insumos");
    revalidatePath("/financeiro");
    revalidatePath("/colheitas");
    revalidatePath("/plantio");
    revalidatePath("/tratos");
    return {
      ok: true,
      mensagem: r.atualizados
        ? `${r.atualizados} registro(s) corrigido(s) para o formato AAAA/AA. Safras agora: ${r.safras.join(", ") || "nenhuma"}.`
        : "Nenhuma safra antiga encontrada — seus registros já usam o formato AAAA/AA.",
    };
  } catch (e) {
    console.error(e);
    return falha(e);
  }
}

export async function salvarPreco(
  prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const parsed = historicoPrecoSchema.safeParse({
    ano: campo(formData, "ano"),
    mes: campo(formData, "mes"),
    precoMedio: campo(formData, "precoMedio"),
    fonte: campo(formData, "fonte"),
    atrPorTonelada: campo(formData, "atrPorTonelada"),
    precoKgAtr: campo(formData, "precoKgAtr"),
  });

  if (!parsed.success) {
    return { ok: false, error: primeiraMensagem(parsed.error) };
  }

  const { ano, mes, precoMedio, fonte, atrPorTonelada, precoKgAtr } = parsed.data;

  try {
    await prisma.historicoPreco.upsert({
      where: { userId_ano_mes: { userId: await usuarioId(), ano, mes } },
      update: { precoMedio, fonte, atrPorTonelada, precoKgAtr },
      create: {
        userId: await usuarioId(),
        ano,
        mes,
        precoMedio,
        fonte,
        atrPorTonelada,
        precoKgAtr,
      },
    });
  } catch (e) {
    console.error(e);
    return falha(e);
  }

  revalidatePath("/historico-preco");
  revalidatePath("/simulador");
  return { ok: true, mensagem: `Preço de ${mes}/${ano} salvo.` };
}

/**
 * Salva só o ATR do mês, sem mexer no preço em R$/t.
 *
 * O comparativo do simulador se apoia no `precoKgAtr` (quanto a usina paga
 * por kg de ATR no mês), que é o número que de fato muda de um mês para o
 * outro. `precoMedio` é opcional no banco: quem cadastra só o ATR não
 * precisa inventar um R$/t.
 */
export async function salvarAtrMes(
  prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const ano = Number(campo(formData, "ano"));
  const mes = Number(campo(formData, "mes"));
  const bruto = campo(formData, "precoKgAtr").replace(",", ".");
  const precoKgAtr = Number(bruto);

  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) {
    return { ok: false, error: "Ano inválido" };
  }
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    return { ok: false, error: "Mês inválido" };
  }
  if (bruto.trim() === "") {
    // Campo vacío: quita el ATR del mes (si existía).
    try {
      const userId = await usuarioId();
      await prisma.historicoPreco.deleteMany({
        where: { userId, ano, mes, precoKgAtr: { not: null } },
      });
    } catch (e) {
      console.error(e);
      return falha(e);
    }
    revalidatePath("/historico-preco");
    revalidatePath("/simulador");
    return { ok: true, mensagem: `ATR de ${MESES[mes - 1]}/${ano} limpiado.` };
  }
  if (!Number.isFinite(precoKgAtr) || precoKgAtr <= 0) {
    return { ok: false, error: "Informe o ATR do mês maior que zero" };
  }

  try {
    const userId = await usuarioId();
    await prisma.historicoPreco.upsert({
      where: { userId_ano_mes: { userId, ano, mes } },
      update: { precoKgAtr },
      create: { userId, ano, mes, precoKgAtr },
    });
  } catch (e) {
    console.error(e);
    return falha(e);
  }

  revalidatePath("/historico-preco");
  revalidatePath("/simulador");
  return { ok: true, mensagem: `ATR de ${MESES[mes - 1]}/${ano} salvo.` };
}

export async function excluirPreco(
  ano: number,
  mes: number,
): Promise<ActionState> {
  try {
    await prisma.historicoPreco.delete({
      where: { userId_ano_mes: { userId: await usuarioId(), ano, mes } },
    });
  } catch (e) {
    console.error(e);
    return falha(e);
  }
  revalidatePath("/historico-preco");
  revalidatePath("/simulador");
  return { ok: true };
}
