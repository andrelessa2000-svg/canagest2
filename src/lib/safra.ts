const FORMATO_SAFRA = /^(\d{4})\/(\d{2})$/;

export function anoDeSafra(safra: string | null | undefined): number | null {
  if (!safra) return null;
  const m = FORMATO_SAFRA.exec(safra.trim());
  return m ? Number(m[1]) : null;
}

export function safraDeAno(ano: number): string {
  return `${ano}/${String(ano + 1).slice(-2)}`;
}

export function safraAtual(): string {
  return safraDeAno(new Date().getFullYear());
}

export function proximaSafra(safra: string): string {
  const ano = anoDeSafra(safra);
  return ano === null ? safra : safraDeAno(ano + 1);
}

export function safrasSugeridas(quantidade = 4): string[] {
  const ano = new Date().getFullYear();
  return Array.from({ length: quantidade }, (_, i) => safraDeAno(ano - 1 + i));
}

export function normalizarSafra(valor: string | null | undefined): string | null {
  const bruto = (valor ?? "").trim();
  if (!bruto) return null;

  let ano: number | null = null;

  const quatroPorDois = /^(\d{4})\s*[\/\-–\s]\s*(\d{2}|\d{4})$/.exec(bruto);
  if (quatroPorDois) {
    const primeiro = Number(quatroPorDois[1]);
    const segundoTexto = quatroPorDois[2];
    const segundo = segundoTexto.length === 4 ? Number(segundoTexto) : 2000 + Number(segundoTexto);
    if (segundo === primeiro + 1) ano = primeiro;
  } else {
    const doisPorDois = /^(\d{2})\s*[\/\-–\s]\s*(\d{2})$/.exec(bruto);
    if (doisPorDois) {
      const primeiro = Number(doisPorDois[1]);
      if (Number(doisPorDois[2]) === (primeiro + 1) % 100) ano = 2000 + primeiro;
    } else {
      const soAno = /^(\d{4})$/.exec(bruto);
      if (soAno) ano = Number(soAno[1]);
    }
  }

  if (ano === null || ano < 1950 || ano > 2200) return null;
  return safraDeAno(ano);
}

export function safrasIguais(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizarSafra(a);
  const nb = normalizarSafra(b);
  return na !== null && nb !== null && na === nb;
}

export function anoDeSafraIgual(
  safra: string | null | undefined,
  ano: number,
): boolean {
  return anoDeSafra(safra) === ano;
}

export function ordenarSafras(lista: (string | null | undefined)[]): string[] {
  const unicas = new Set<string>();
  for (const s of lista) {
    const n = normalizarSafra(s);
    if (n) unicas.add(n);
  }
  return [...unicas].sort((a, b) => (anoDeSafra(a) ?? 0) - (anoDeSafra(b) ?? 0));
}

export function listaDeSafras(lista: (string | null | undefined)[], quantidade = 4): string[] {
  const unicas = new Set(ordenarSafras(lista));
  for (const s of safrasSugeridas(quantidade)) unicas.add(s);
  return [...unicas].sort((a, b) => (anoDeSafra(b) ?? 0) - (anoDeSafra(a) ?? 0));
}

export const MENSAGEM_SAFRA_INVALIDA =
  "Safra inválida. Use o formato AAAA/AA — por exemplo 2025/26.";
