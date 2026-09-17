import Link from "next/link";
import { Sprout } from "lucide-react";

export function Brand() {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      aria-label="CanaGest — página inicial"
    >
      <span className="grid size-9 place-items-center rounded-[10px] bg-accent text-surface shadow-[inset_0_-2px_0_rgba(0,0,0,0.18)]">
        <Sprout className="size-5" strokeWidth={2.2} />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.35rem] font-medium tracking-tight text-ink">
          CanaGest
        </span>
        <span className="hidden text-[0.62rem] font-medium tracking-[0.18em] text-ink-3 uppercase sm:block">
          caderno de campo
        </span>
      </span>
    </Link>
  );
}