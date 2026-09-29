"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  BarChart3,
  Calculator,
  ChevronDown,
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

const itensPrincipais = [
  { href: "/", rotulo: "Início", icone: Home },
  { href: "/fazendas", rotulo: "Fazendas", icone: Sprout },
  { href: "/usinas", rotulo: "Usinas", icone: Factory },
  { href: "/colheitas", rotulo: "Colheitas", icone: Tractor },
  { href: "/plantio", rotulo: "Plantio", icone: Leaf },
  { href: "/tratos", rotulo: "Tratos", icone: SprayCan },
  { href: "/financeiro", rotulo: "Financeiro", icone: Wallet },
  { href: "/relatorios", rotulo: "Relatórios", icone: BarChart3 },
];

const itensFerramentas = [
  { href: "/simulador", rotulo: "Simulador", icone: Calculator },
  { href: "/analise-talhoes", rotulo: "Análise talhões", icone: BarChart3 },
  { href: "/calculadoras", rotulo: "Calculadoras", icone: Calculator },
];

function ativo(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ferramentaAtiva(pathname: string): boolean {
  return itensFerramentas.some((item) => ativo(pathname, item.href));
}

export function AppShell({
  children,
  usuario,
}: {
  children: React.ReactNode;
  usuario?: { nome?: string | null; email?: string | null; image?: string | null } | null;
}) {
  const pathname = usePathname();
  const [ferramentasAberto, setFerramentasAberto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setFerramentasAberto(false);
      }
    }
    if (ferramentasAberto) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ferramentasAberto]);

  // Fechar dropdown quando a rota mudar (navegação via Link)
  useEffect(() => {
    if (ferramentasAberto) {
      setFerramentasAberto(false);
    }
  }, [pathname]);

  return (
    <div className="min-h-dvh">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 btn btn-primary"
      >
        Pular para o conteúdo principal
      </a>
      <div className="sticky top-0 z-40">
        <OfflineBanner />
        <header className="border-b border-line bg-base/90 backdrop-blur">
          <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
            <Brand />

            <nav className="hidden items-center gap-1 md:flex" aria-label="Navegação principal">
              {itensPrincipais.map(({ href, rotulo }) => (
                <Link
                  key={href}
                  href={href}
                  className="nav-link whitespace-nowrap shrink-0"
                  data-active={ativo(pathname, href)}
                  aria-current={ativo(pathname, href) ? "page" : undefined}
                >
                  {rotulo}
                </Link>
              ))}

              <div className="relative" role="menubar">
                <button
                  type="button"
                  className={`nav-link whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    ferramentaAtiva(pathname) ? "bg-accent-soft text-accent-strong font-semibold" : ""
                  }`}
                  aria-haspopup="true"
                  aria-expanded={ferramentasAberto}
                  aria-label="Ferramentas"
                  onClick={() => setFerramentasAberto(!ferramentasAberto)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setFerramentasAberto(!ferramentasAberto);
                    }
                    if (e.key === "Escape") {
                      setFerramentasAberto(false);
                    }
                  }}
                >
                  Ferramentas
                  <ChevronDown
                    className={`size-4 transition-transform ${ferramentasAberto ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </button>

                {ferramentasAberto && (
                  <div
                    ref={dropdownRef}
                    className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-lg border border-line bg-surface shadow-lg py-1"
                    role="menu"
                  >
                    {itensFerramentas.map(({ href, rotulo, icone: Icone }) => (
                      <Link
                        key={href}
                        href={href}
                        role="menuitem"
                        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
                          ativo(pathname, href)
                            ? "bg-accent-soft text-accent-strong font-semibold"
                            : "text-ink-2 hover:bg-surface-muted hover:text-ink"
                        }`}
                      >
                        <Icone className="size-4" strokeWidth={ativo(pathname, href) ? 2.4 : 2} />
                        {rotulo}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </nav>

            <div className="flex items-center gap-2">
              {usuario ? (
                <>
                  <Link
                    href="/conta"
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

      <main id="main-content" className="mx-auto w-full max-w-5xl px-4 pt-6 pb-28 sm:px-6 md:pt-10 md:pb-20">
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
          {itensPrincipais.map(({ href, rotulo, icone: Icone }) => {
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
          <div className="relative">
            <button
              type="button"
              className={`flex min-w-14 shrink-0 flex-col items-center gap-1 py-2 text-[0.68rem] font-medium transition-colors ${
                ferramentaAtiva(pathname) ? "text-accent-strong" : "text-ink-3"
              }`}
              onClick={() => setFerramentasAberto(!ferramentasAberto)}
              aria-haspopup="true"
              aria-expanded={ferramentasAberto}
              aria-label="Ferramentas"
            >
              <Calculator className="size-5" strokeWidth={ferramentaAtiva(pathname) ? 2.4 : 2} />
              <span className="text-[0.6rem]">Ferramentas</span>
            </button>
{ferramentasAberto && (
                <div
                  ref={dropdownRef}
                  className="absolute bottom-full right-0 mb-1 z-50 min-w-[160px] rounded-lg border border-line bg-surface shadow-lg py-1"
                >
                {itensFerramentas.map(({ href, rotulo, icone: Icone }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium ${
                      ativo(pathname, href)
                        ? "bg-accent-soft text-accent-strong font-semibold"
                        : "text-ink-2 hover:bg-surface-muted hover:text-ink"
                    }`}
                  >
                    <Icone className="size-4" strokeWidth={ativo(pathname, href) ? 2.4 : 2} />
                    {rotulo}
                  </Link>
                ))}
              </div>
            )}
          </div>
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