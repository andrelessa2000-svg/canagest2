"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { prisma } from "./db";
import { auth } from "./auth";

export type AuthActionState =
  | { ok: true; mensaje?: string; enlace?: string }
  | { ok: false; error: string };

function campo(formData: FormData, nome: string): string {
  return formData.get(nome)?.toString().trim() ?? "";
}

export async function registrarUsuario(
  prev: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  const nome = campo(formData, "nome");
  const email = campo(formData, "email").toLowerCase();
  const password = formData.get("password")?.toString() ?? "";

  if (nome.length < 2) return { ok: false, error: "Informe seu nome." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "E-mail inválido." };
  }
  if (password.length < 8) {
    return { ok: false, error: "A senha deve ter ao menos 8 caracteres." };
  }

  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente) {
    return { ok: false, error: "Já existe uma conta com esse e-mail." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    await prisma.user.create({ data: { name: nome, email, passwordHash } });
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Não foi possível criar a conta." };
  }

  redirect("/login?ok=1");
}

export async function solicitarRecuperacion(
  prev: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  const email = campo(formData, "email").toLowerCase();
  const usuario = await prisma.user.findUnique({ where: { email } });

  if (!usuario || !usuario.passwordHash) {
    return {
      ok: true,
      mensaje: "Se a conta existe, você receberá um link de recuperação.",
    };
  }

  const token = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: { userId: usuario.id, token, expires: new Date(Date.now() + 3_600_000) },
  });

  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  const enlace = `${base}/redefinir?token=${token}`;
  console.log(`[dev] Recuperação de senha para ${email}: ${enlace}`);

  return {
    ok: true,
    enlace,
    mensaje: "Modo desenvolvimento: use este link para redefinir a senha.",
  };
}

export async function redefinirSenha(
  prev: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  const token = campo(formData, "token");
  const password = formData.get("password")?.toString() ?? "";
  const confirmar = formData.get("confirmar")?.toString() ?? "";

  if (password.length < 8) {
    return { ok: false, error: "A senha deve ter ao menos 8 caracteres." };
  }
  if (password !== confirmar) {
    return { ok: false, error: "As senhas não coincidem." };
  }

  const registro = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!registro || registro.usado || registro.expires < new Date()) {
    return { ok: false, error: "O link é inválido ou expirou." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: registro.userId },
    data: { passwordHash },
  });
  await prisma.passwordResetToken.update({
    where: { id: registro.id },
    data: { usado: true },
  });

  redirect("/login?ok=2");
}

async function usuarioAtual() {
  try {
    const session = await auth();
    if (!session?.user?.id) return null;
    return await prisma.user.findUnique({ where: { id: session.user.id } });
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function atualizarPerfil(
  prev: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  const user = await usuarioAtual();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const nome = campo(formData, "nome");
  const image = campo(formData, "image");
  if (nome.length < 2) return { ok: false, error: "Informe seu nome." };

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { name: nome, image: image || null },
    });
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Não foi possível atualizar o perfil." };
  }

  revalidatePath("/");
  revalidatePath("/cuenta");
  return { ok: true, mensaje: "Perfil atualizado." };
}

export async function cambiarSenha(
  prev: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  const user = await usuarioAtual();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const atual = formData.get("atual")?.toString() ?? "";
  const nova = formData.get("nova")?.toString() ?? "";
  const confirmar = formData.get("confirmar")?.toString() ?? "";

  if (user.passwordHash && !(await bcrypt.compare(atual, user.passwordHash))) {
    return { ok: false, error: "A senha atual é incorreta." };
  }
  if (nova.length < 8) {
    return { ok: false, error: "A nova senha deve ter ao menos 8 caracteres." };
  }
  if (nova !== confirmar) {
    return { ok: false, error: "As senhas não coincidem." };
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(nova, 12) },
    });
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Não foi possível atualizar a senha." };
  }

  return { ok: true, mensaje: "Senha atualizada." };
}