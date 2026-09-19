"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-soft no-print">
      Imprimir / PDF
    </button>
  );
}