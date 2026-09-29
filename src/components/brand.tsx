import Link from "next/link";
import { Sprout } from "lucide-react";

export function Brand() {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-2.5 rounded-lg"
      aria-label="CanaGest — página inicial"
    >
      <span className="grid size-9 place-items-center rounded-[10px] bg-accent text-white">
        <Sprout className="size-5" strokeWidth={2.2} />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="font-display text-[1.2rem] text-ink">CanaGest</span>
        <span className="text-xs font-medium text-ink-3">Gestão canavieira</span>
      </span>
    </Link>
  );
}
