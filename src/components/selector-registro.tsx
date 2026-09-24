"use client";

export function SelectorRegistro({
  valor,
  onChange,
}: {
  valor: boolean;
  onChange: (proj: boolean) => void;
}) {
  const opciones = [
    { id: false, rotulo: "Caderno de campo" },
    { id: true, rotulo: "Projeção" },
  ];
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Tipo de registro">
      {opciones.map((o) => (
        <button
          key={String(o.id)}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={valor === o.id}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            valor === o.id
              ? "bg-accent text-surface"
              : "bg-surface-muted text-ink-2 hover:bg-surface-muted"
          }`}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}