import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icone: Icone,
  titulo,
  descricao,
  ctaTexto,
  ctaHref,
}: {
  icone: LucideIcon;
  titulo: string;
  descricao: string;
  ctaTexto?: string;
  ctaHref?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[10px] border border-dashed border-line-strong bg-surface/60 px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-[10px] bg-accent-soft text-accent">
        <Icone className="size-6" strokeWidth={1.8} />
      </span>
      <div className="grid gap-1">
        <h2 className="font-display text-xl text-ink">{titulo}</h2>
        <p className="max-w-sm text-sm leading-relaxed text-ink-2">{descricao}</p>
      </div>
      {ctaTexto && ctaHref && (
        <Link href={ctaHref} className="btn btn-primary">
          {ctaTexto}
        </Link>
      )}
    </div>
  );
}