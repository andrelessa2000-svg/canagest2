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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
      <div className="grid min-w-0 gap-1">
        {rotulo && <p className="eyebrow">{rotulo}</p>}
        <h1 className="font-display text-[1.728rem] leading-tight text-ink sm:text-[2.074rem]">
          {titulo}
        </h1>
        {descricao && (
          <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-ink-2">{descricao}</p>
        )}
      </div>
      {acao && <div className="flex items-center gap-2">{acao}</div>}
    </div>
  );
}
