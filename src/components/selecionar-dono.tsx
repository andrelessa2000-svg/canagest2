"use client";

import { toast } from "sonner";
import type { ActionState } from "@/lib/actions";

export type DonoMini = { id: string; nome: string };

export function SelecionarDono({
  fazendaId,
  atual,
  donos,
  definir,
  ariaLabel = "Proprietário da fazenda",
  largura = "w-40",
}: {
  fazendaId: string;
  atual: string | null;
  donos: DonoMini[];
  definir: (fazendaId: string, prev: ActionState | undefined, formData: FormData) => Promise<ActionState>;
  ariaLabel?: string;
  largura?: string;
}) {
  async function acao(fd: FormData) {
    const r = await definir(fazendaId, undefined, fd);
    if (r.ok) {
      toast.success("Dono atualizado");
    } else {
      toast.error(r.error);
    }
  }

  return (
    <form action={acao}>
      <select
        name="proprietarioId"
        defaultValue={atual ?? ""}
        aria-label={ariaLabel}
        title="Escolha de quem é esta fazenda — salva na hora"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className={`field-input ${largura} shrink-0 py-1.5 text-xs`}
      >
        <option value="">Sem dono informado</option>
        {donos.map((d) => (
          <option key={d.id} value={d.id}>
            {d.nome}
          </option>
        ))}
      </select>
    </form>
  );
}
