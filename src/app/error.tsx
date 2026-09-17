"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[50vh] place-items-center text-center">
      <div className="grid max-w-sm gap-4">
        <p className="eyebrow text-ink-3">ops</p>
        <h1 className="font-display text-2xl text-ink">
          Algo deu errado nesta página
        </h1>
        <p className="text-sm leading-relaxed text-ink-2">
          Não foi possível carregar o conteúdo. Tente recarregar ou volte em
          seguida.
        </p>
        <div className="flex justify-center gap-2">
          <button onClick={reset} className="btn btn-primary">
            Tentar novamente
          </button>
        </div>
      </div>
    </div>
  );
}