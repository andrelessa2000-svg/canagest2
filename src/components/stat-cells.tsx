import Link from "next/link";
import type { ReactNode } from "react";

export function GradeMetricas({ children }: { children: ReactNode }) {
  return <div className="metric-grid grid-cols-2 md:grid-cols-4">{children}</div>;
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
    <div className={`min-w-0 px-4 py-4 ${destaque ? "bg-accent" : "bg-surface"}`}>
      <p className={destaque ? "eyebrow !text-white/85" : "eyebrow"}>{rotulo}</p>
      <p
        className={`mt-1 break-words text-[1.2rem] font-bold leading-tight tracking-tight tnum lg:text-[1.44rem] ${
          destaque ? "text-white" : "text-ink"
        }`}
      >
        {valor}
      </p>
      {legenda && (
        <p className={`mt-1 text-xs ${destaque ? "text-white/85" : "text-ink-3"}`}>{legenda}</p>
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
        <span className="grid min-w-0 gap-0.5">
          <span className="truncate text-[0.9375rem] font-semibold text-ink">{principal}</span>
          {secundario && (
            <span className="flex flex-wrap items-center gap-x-2 text-xs text-ink-3">
              {secundario}
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-3">
          {destaque && <span className="tnum text-[0.9375rem] font-bold text-ink">{destaque}</span>}
          {nota && <span className="hidden text-xs text-ink-3 sm:block">{nota}</span>}
        </span>
      </Link>
    </li>
  );
}
