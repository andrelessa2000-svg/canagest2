"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Calculator,
  Factory,
  Home,
  Layers,
  LayoutGrid,
  Leaf,
  SlidersHorizontal,
  SprayCan,
  Sprout,
  Tractor,
  TrendingUp,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { Toaster } from "sonner";
import { Brand } from "./brand";
import { BotaoSair } from "./botao-sair";
import { InstallAppButton } from "./install-app-button";
import { OfflineBanner } from "./offline-banner";

type Item = { href: string; rotulo: string; icone: LucideIcon };

const grupos: { titulo: string; itens: Item[] }[] = [
  {
    titulo: "Visão geral",
    itens: [{ href: "/", rotulo: "Início", icone: Home }],
  },
  {
    titulo: "Cadastro",
    itens: [
      { href: "/fazendas", rotulo: "Fazendas", icone: Sprout },
      { href: "/usinas", rotulo: "Usinas", icone: Factory },
    ],
  },
  {
    titulo: "Operação",
    itens: [
      { href: "/colheitas", rotulo: "Colheitas", icone: Tractor },
      { href: "/plantio", rotulo: "Plantio", icone: Leaf },
      { href: "/tratos", rotulo: "Tratos", icone: SprayCan },
    ],
  },
  {
    titulo: "Gestão",
    itens: [
      { href: "/financeiro", rotulo: "Financeiro", icone: Wallet },
      { href: "/relatorios", rotulo: "Relatórios", icone: BarChart3 },
    ],
  },
  {
    titulo: "Ferramentas",
    itens: [
      { href: "/simulador/cenarios", rotulo: "Simulador de plantio", icone: SlidersHorizontal },
      { href: "/simulador/atr", rotulo: "Comparativo de ATR", icone: TrendingUp },
      { href: "/analise-talhoes", rotulo: "Análise por talhão", icone: Layers },
      { href: "/calculadoras", rotulo: "Calculadoras", icone: Calculator },
    ],
  },
];

const principaisMobile: Item[] = [
  { href: "/", rotulo: "Início", icone: Home },
  { href: "/colheitas", rotulo: "Colheitas", icone: Tractor },
  { href: "/plantio", rotulo: "Plantio", icone: Leaf },
  { href: "/tratos", rotulo: "Tratos", icone: SprayCan },
];

function ativo(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

type Usuario = { nome?: string | null; email?: string | null; image?: string | null } | null;

function Avatar({ usuario }: { usuario: NonNullable<Usuario> }) {
  if (usuario.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={usuario.image} alt="" className="size-9 rounded-full object-cover" />
    );
  }
  return (
    <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-sm font-bold text-accent-strong">
      {(usuario.nome ?? usuario.email ?? "?").trim().slice(0, 1).toUpperCase()}
    </span>
  );
}

export function AppShell({
  children,
  usuario,
}: {
  children: React.ReactNode;
  usuario?: Usuario;
}) {
  const pathname = usePathname();
  // O painel "Mais" guarda a rota em que foi aberto: ao navegar, fecha sozinho.
  const [maisAbertoEm, setMaisAbertoEm] = useState<string | null>(null);
  const maisAberto = maisAbertoEm === pathname;

  useEffect(() => {
    if (!maisAberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMaisAbertoEm(null);
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [maisAberto]);

  const moduloAtivoNoMais = grupos
    .flatMap((g) => g.itens)
    .some((i) => ativo(pathname, i.href) && !principaisMobile.some((p) => p.href === i.href));

  return (
    <div className="min-h-dvh">
      <a
        href="#main-content"
        className="btn btn-primary sr-only z-[60] focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Pular para o conteúdo principal
      </a>

      {/* ---------- Menu lateral (desktop) ---------- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[var(--sidebar-w)] flex-col border-r border-line bg-surface lg:flex">
        <div className="px-4 pb-4 pt-5">
          <Brand />
        </div>

        <nav aria-label="Navegação principal" className="grid flex-1 content-start gap-5 overflow-y-auto px-3 pb-4">
          {grupos.map((g) => (
            <div key={g.titulo}>
              <p className="nav-group-title">{g.titulo}</p>
              <ul className="grid gap-0.5">
                {g.itens.map(({ href, rotulo, icone: Icone }) => {
                  const atual = ativo(pathname, href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        className="nav-link"
                        data-active={atual}
                        aria-current={atual ? "page" : undefined}
                      >
                        <Icone className="size-[1.15rem] shrink-0" strokeWidth={atual ? 2.4 : 2} aria-hidden="true" />
                        {rotulo}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="grid gap-2 border-t border-line p-3">
          {usuario ? (
            <>
              <Link
                href="/conta"
                className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-muted"
                aria-label="Minha conta"
              >
                <Avatar usuario={usuario} />
                <span className="grid min-w-0 leading-tight">
                  <span className="truncate text-sm font-semibold text-ink">{usuario.nome ?? "Minha conta"}</span>
                  <span className="truncate text-xs text-ink-3">{usuario.email}</span>
                </span>
              </Link>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <BotaoSair />
                </div>
                <InstallAppButton />
              </div>
            </>
          ) : (
            <Link href="/login" className="btn btn-primary">
              Entrar
            </Link>
          )}
        </div>
      </aside>

      <div className="lg:pl-[var(--sidebar-w)]">
        <OfflineBanner />

        {/* ---------- Barra superior (celular/tablet) ---------- */}
        <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur lg:hidden">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
            <Brand />
            <div className="flex items-center gap-2">
              <InstallAppButton />
              {usuario ? (
                <Link href="/conta" aria-label="Minha conta">
                  <Avatar usuario={usuario} />
                </Link>
              ) : (
                <Link href="/login" className="btn btn-primary">
                  Entrar
                </Link>
              )}
            </div>
          </div>
        </header>

        <main
          id="main-content"
          className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-16 lg:pt-10"
        >
          {children}
        </main>
      </div>

      {/* ---------- Barra inferior (celular/tablet) ---------- */}
      <nav
        aria-label="Navegação inferior"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="mx-auto grid max-w-xl grid-cols-5">
          {principaisMobile.map(({ href, rotulo, icone: Icone }) => {
            const atual = ativo(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={atual ? "page" : undefined}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors ${
                    atual ? "text-accent-strong" : "text-ink-3"
                  }`}
                >
                  <Icone className="size-[1.3rem]" strokeWidth={atual ? 2.4 : 2} aria-hidden="true" />
                  {rotulo}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              aria-label="Mais módulos"
              aria-haspopup="dialog"
              aria-expanded={maisAberto}
              onClick={() => setMaisAbertoEm(maisAberto ? null : pathname)}
              className={`flex min-h-16 w-full flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors ${
                maisAberto || moduloAtivoNoMais ? "text-accent-strong" : "text-ink-3"
              }`}
            >
              <LayoutGrid className="size-[1.3rem]" strokeWidth={moduloAtivoNoMais ? 2.4 : 2} aria-hidden="true" />
              Mais
            </button>
          </li>
        </ul>
      </nav>

      {maisAberto && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Todos os módulos">
          <button
            type="button"
            aria-label="Fechar"
            className="absolute inset-0 bg-ink/45"
            onClick={() => setMaisAbertoEm(null)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[var(--radius)] bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[var(--shadow-float)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg text-ink">Todos os módulos</h2>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setMaisAbertoEm(null)}
                className="btn btn-ghost !min-h-10 !px-2"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="grid gap-5">
              {grupos.map((g) => (
                <section key={g.titulo}>
                  <p className="nav-group-title !px-0">{g.titulo}</p>
                  <ul className="grid grid-cols-3 gap-2">
                    {g.itens.map(({ href, rotulo, icone: Icone }) => {
                      const atual = ativo(pathname, href);
                      return (
                        <li key={href}>
                          <Link
                            href={href}
                            aria-current={atual ? "page" : undefined}
                            className={`flex h-full flex-col items-center gap-2 rounded-[var(--radius)] border p-3 text-center text-xs font-semibold transition-colors ${
                              atual
                                ? "border-accent bg-accent-soft text-accent-strong"
                                : "border-line bg-surface text-ink-2 hover:bg-surface-muted"
                            }`}
                          >
                            <Icone className="size-6" strokeWidth={atual ? 2.4 : 2} aria-hidden="true" />
                            {rotulo}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}

      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "var(--surface)",
            color: "var(--ink)",
            border: "1px solid var(--line-strong)",
            borderRadius: "var(--radius)",
            fontSize: "0.9375rem",
          },
        }}
      />
    </div>
  );
}
