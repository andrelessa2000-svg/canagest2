"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calculator,
  Factory,
  Home,
  Leaf,
  SprayCan,
  Sprout,
  Tractor,
  Wallet,
} from "lucide-react";
import { Toaster } from "sonner";
import { Brand } from "./brand";
import { BotaoSair } from "./botao-sair";
import { InstallAppButton } from "./install-app-button";
import { OfflineBanner } from "./offline-banner";

const itens = [
  { href: "/", rotulo: "Início", icone: Home },
  { href: "/fazendas", rotulo: "Fazendas", icone: Sprout },
  { href: "/usinas", rotulo: "Usinas", icone: Factory },
  { href: "/colheitas", rotulo: "Colheitas", icone: Tractor },
  { href: "/plantio", rotulo: "Plantio", icone: Leaf },
  { href: "/tratos", rotulo: "Tratos", icone: SprayCan },
  { href: "/financeiro", rotulo: "Financeiro", icone: Wallet },
  { href: "/relatorios", rotulo: "Relatórios", icone: BarChart3 },
  { href: "/calculadoras", rotulo: "Calculadoras", icone: Calculator },
];

function ativo(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  children,
  usuario,
}: {
  children: React.ReactNode;
  usuario?: { nome?: string | null; email?: string | null; image?: string | null } | null;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh">
      <div className="sticky top-0 z-40">
        <OfflineBanner />
        <header className="border-b border-line bg-base/90 backdrop-blur">
          <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
            <Brand />

            <nav
              className="hidden items-center gap-1 md:flex"
              aria-label="Navegação principal"
            >
              {itens.map(({ href, rotulo }) => (
                <Link
                  key={href}
                  href={href}
                  className="nav-link"
                  data-active={ativo(pathname, href)}
                  aria-current={ativo(pathname, href) ? "page" : undefined}
                >
                  {rotulo}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              {usuario ? (
                <>
                  <Link
                    href="/cuenta"
                    className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 text-sm font-medium text-ink-2 transition-colors hover:border-line-strong hover:bg-surface-muted"
                    aria-label="Minha conta"
                  >
                    {usuario.image ? (
                      <img
                        src={usuario.image}
                        alt=""
                        className="size-8 rounded-full object-cover"
                      />
                    ) : (
                      <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                        {(usuario.nome ?? usuario.email ?? "?").trim().slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="max-w-28 truncate">{usuario.nome ?? usuario.email}</span>
                  </Link>
                  <BotaoSair compacto />
                </>
              ) : (
                <Link href="/login" className="btn btn-ghost">
                  Entrar
                </Link>
              )}
              <InstallAppButton />
            </div>
          </div>
        </header>
      </div>

      <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-28 sm:px-6 md:pt-10 md:pb-20">
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur md:hidden"
        aria-label="Navegação inferior"
      >
        <div
          className="flex items-center gap-1 overflow-x-auto px-2 py-1"
          style={{ scrollbarWidth: "none" }}
        >
          {itens.map(({ href, rotulo, icone: Icone }) => {
            const current = ativo(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className="flex min-w-14 shrink-0 flex-col items-center gap-1 py-2 text-[0.68rem] font-medium transition-colors"
                data-active={current}
                aria-current={current ? "page" : undefined}
                style={{
                  color: current ? "var(--accent-strong)" : "var(--ink-3)",
                }}
              >
                <Icone
                  className="size-5"
                  strokeWidth={current ? 2.4 : 2}
                  style={
                    current
                      ? { color: "var(--accent)" }
                      : undefined
                  }
                />
                {rotulo}
              </Link>
            );
          })}
        </div>
      </nav>

      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "var(--surface)",
            color: "var(--ink)",
            border: "1px solid var(--line-strong)",
            borderRadius: "var(--radius)",
            fontSize: "0.875rem",
          },
        }}
      />
    </div>
  );
}