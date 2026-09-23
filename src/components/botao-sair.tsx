"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function BotaoSair({
  compacto = false,
}: {
  compacto?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-danger-strong/25 bg-transparent px-3 py-2 text-sm font-semibold text-danger-strong transition-colors hover:bg-danger-soft ${
        compacto ? "size-9 !px-0" : ""
      }`}
    >
      <LogOut className="size-4" />
      {!compacto && "Sair da conta"}
    </button>
  );
}