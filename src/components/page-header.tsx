export function PageHeader({
  rotulo,
  titulo,
  descricao,
  acao,
}: {
  rotulo?: string;
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="grid gap-1.5">
        {rotulo && <p className="eyebrow">{rotulo}</p>}
        <h1 className="font-display text-[2rem] leading-[1.05] tracking-tight text-ink sm:text-4xl">
          {titulo}
        </h1>
        {descricao && (
          <p className="max-w-lg text-sm leading-relaxed text-ink-2 sm:text-[0.95rem]">
            {descricao}
          </p>
        )}
      </div>
      {acao && <div className="flex items-center gap-2">{acao}</div>}
    </div>
  );
}