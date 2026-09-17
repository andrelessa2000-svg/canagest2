export default function Loading() {
  return (
    <div
      aria-busy="true"
      className="grid min-h-[40vh] place-items-center gap-3 text-center"
    >
      <span className="size-9 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
      <p className="text-sm text-ink-3">Abrindo o caderno…</p>
    </div>
  );
}