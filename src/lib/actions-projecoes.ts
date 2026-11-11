"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";
import { userIdAtual } from "./auth";
import { normalizarSafra } from "./safra";
import { primeiraMensagem } from "./validators";
import {
  projecaoProtocoloSchema,
  projecaoServicoSchema,
  type ProjecaoProtocoloInput,
  type ProjecaoServicoInput,
} from "./validators-projecoes";

export type ActionState = { ok: true; mensagem?: string } | { ok: false; error: string };

function campo(formData: FormData, nome: string): string {
  return formData.get(nome)?.toString() ?? "";
}

function falha(e: unknown): ActionState {
  if (e instanceof Error) return { ok: false, error: e.message };
  return { ok: false, error: "Não foi possível concluir a operação." };
}

function dadosServico(d: ProjecaoServicoInput) {
  const safra = d.safra ? normalizarSafra(d.safra) : null;
  return {
    nome: d.nome,
    safra,
    fazendaId: d.fazendaId || null,
    tipo: d.tipo,
    tipoExecucao: d.tipoExecucao,
    areaHa: d.areaHa > 0 ? d.areaHa : null,
    produtividade: d.produtividade,
    precoMensal: d.preco,
    custos: d.custos.length > 0 ? (d.custos as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
  };
}

function parseServico(formData: FormData) {
  return projecaoServicoSchema.safeParse({
    nome: campo(formData, "nome"),
    safra: campo(formData, "safra"),
    fazendaId: campo(formData, "fazendaId"),
    tipo: campo(formData, "tipo"),
    tipoExecucao: campo(formData, "tipoExecucao"),
    areaHa: campo(formData, "areaHa"),
    produtividade: campo(formData, "produtividade"),
    preco: campo(formData, "preco"),
    custos: campo(formData, "custos"),
  });
}

export async function criarProjecaoServico(
  prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseServico(formData);
  if (!parsed.success) return { ok: false, error: primeiraMensagem(parsed.error) };

  try {
    await prisma.projecaoServico.create({
      data: { userId: await userIdAtual(), ...dadosServico(parsed.data) },
    });
  } catch (e) {
    console.error(e);
    return falha(e);
  }

  revalidatePath("/projecoes");
  return { ok: true, mensagem: "Comparação de serviço salva." };
}

export async function atualizarProjecaoServico(
  prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const id = campo(formData, "id");
  if (!id) return { ok: false, error: "Registro não encontrado." };

  const parsed = parseServico(formData);
  if (!parsed.success) return { ok: false, error: primeiraMensagem(parsed.error) };

  try {
    await prisma.projecaoServico.update({
      where: { id, userId: await userIdAtual() },
      data: dadosServico(parsed.data),
    });
  } catch (e) {
    console.error(e);
    return falha(e);
  }

  revalidatePath("/projecoes");
  return { ok: true, mensagem: "Comparação de serviço atualizada." };
}

export async function excluirProjecaoServico(id: string): Promise<ActionState> {
  try {
    await prisma.projecaoServico.delete({ where: { id, userId: await userIdAtual() } });
  } catch (e) {
    console.error(e);
    return falha(e);
  }
  revalidatePath("/projecoes");
  return { ok: true };
}

function dadosProtocolo(d: ProjecaoProtocoloInput) {
  const safra = d.safra ? normalizarSafra(d.safra) : null;
  return {
    nome: d.nome,
    safra,
    fazendaId: d.fazendaId || null,
    areaHa: d.areaHa,
    produtividade: d.produtividade,
    precoMensal: d.preco,
    cortes: d.cortes,
    custos: d.custos.length > 0 ? (d.custos as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
  };
}

function parseProtocolo(formData: FormData) {
  return projecaoProtocoloSchema.safeParse({
    nome: campo(formData, "nome"),
    safra: campo(formData, "safra"),
    fazendaId: campo(formData, "fazendaId"),
    areaHa: campo(formData, "areaHa"),
    produtividade: campo(formData, "produtividade"),
    preco: campo(formData, "preco"),
    cortes: campo(formData, "cortes"),
    custos: campo(formData, "custos"),
  });
}

export async function criarProjecaoProtocolo(
  prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseProtocolo(formData);
  if (!parsed.success) return { ok: false, error: primeiraMensagem(parsed.error) };

  try {
    await prisma.projecaoProtocolo.create({
      data: { userId: await userIdAtual(), ...dadosProtocolo(parsed.data) },
    });
  } catch (e) {
    console.error(e);
    return falha(e);
  }

  revalidatePath("/projecoes");
  return { ok: true, mensagem: "Protocolo salvo." };
}

export async function atualizarProjecaoProtocolo(
  prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const id = campo(formData, "id");
  if (!id) return { ok: false, error: "Registro não encontrado." };

  const parsed = parseProtocolo(formData);
  if (!parsed.success) return { ok: false, error: primeiraMensagem(parsed.error) };

  try {
    await prisma.projecaoProtocolo.update({
      where: { id, userId: await userIdAtual() },
      data: dadosProtocolo(parsed.data),
    });
  } catch (e) {
    console.error(e);
    return falha(e);
  }

  revalidatePath("/projecoes");
  return { ok: true, mensagem: "Protocolo atualizado." };
}

export async function excluirProjecaoProtocolo(id: string): Promise<ActionState> {
  try {
    await prisma.projecaoProtocolo.delete({ where: { id, userId: await userIdAtual() } });
  } catch (e) {
    console.error(e);
    return falha(e);
  }
  revalidatePath("/projecoes");
  return { ok: true };
}