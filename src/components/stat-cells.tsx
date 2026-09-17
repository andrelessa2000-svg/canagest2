import Link from "next/link";
import type { ReactNode } from "react";

export function GradeMetricas({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line bg-line md:grid-cols-4">
      {children}
    </div>
  );
}

export function CelulaMetrica({
  rotulo,
  valor,
  legenda,
  destaque = false,
}: {
  rotulo: string;
  valor: string;
  legenda?: string;
  destaque?: boolean;
}) {
  return (
    <div className={destaque ? "bg-accent px-4 py-5" : "bg-surface px-4 py-5"}>
      <p className={destaque ? "eyebrow text-surface/70" : "eyebrow text-ink-3"}>
        {rotulo}
      </p>
      <p
        className={`mt-1.5 font-mono text-2xl leading-none tracking-tight tabular-nums sm:text-[1.75rem] ${
          destaque ? "text-surface" : "text-ink"
        }`}
      >
        {valor}
      </p>
      {legenda && (
        <p
          className={`mt-2 text-xs ${destaque ? "text-surface/75" : "text-ink-3"}`}
        >
          {legenda}
        </p>
      )}
    </div>
  );
}

export function LinhaLink({
  href,
  principal,
  secundario,
  destaque,
  nota,
}: {
  href: string;
  principal: ReactNode;
  secundario?: ReactNode;
  destaque?: ReactNode;
  nota?: ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-surface-muted"
      >
        <span className="grid gap-0.5">
          <span className="text-sm font-medium text-ink">{principal}</span>
          {secundario && (
            <span className="flex flex-wrap items-center gap-x-2 text-xs text-ink-3">
              {secundario}
            </span>
          )}
        </span>
        <span className="flex items-center gap-3">
          {destaque && (
            <span className="tnum text-sm font-semibold text-ink">{destaque}</span>
          )}
          {nota && <span className="hidden text-xs text-ink-3 sm:block">{nota}</span>}
        </span>
      </Link>
    </li>
  );
}