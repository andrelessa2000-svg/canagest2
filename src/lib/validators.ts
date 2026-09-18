import { z } from "zod";
import { parseDecimal, tarefasParaHa, UNIDADES_AREA } from "./format";
import { COMPLEMENTO_TIPOS, MODELOS_USINA } from "./colheita";

const TIPOS = ["planta", "soca", "ressoca"] as const;
export type TipoColheita = (typeof TIPOS)[number];

export const TIPOS_COLHEITA: Record<TipoColheita, string> = {
  planta: "Cana planta",
  soca: "Soca",
  ressoca: "Ressoca",
};

const optionalField = (max: number) =>
  z
    .union([z.literal(""), z.string().trim().min(1).max(max)])
    .transform((v) => (v === "" ? undefined : v));

function numField(label: string) {
  return z
    .string()
    .min(1, `${label} é obrigatório(a)`)
    .transform((v) => parseDecimal(v))
    .pipe(z.number().positive(`${label} deve ser maior que zero`).finite(`${label} inválido(a)`));
}

export function tipoLabel(tipo: string): string {
  return TIPOS_COLHEITA[tipo as TipoColheita] ?? tipo;
}

export const fazendaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da fazenda").max(80),
});

export const talhaoSchema = z
  .object({
    fazendaId: z.string().min(1, "Selecione a fazenda"),
    nome: z.string().trim().min(1, "Informe o nome do talhão").max(20),
    area: numField("Área do talhão"),
    unidade: z.enum(UNIDADES_AREA, { error: "Selecione a unidade da área" }),
  })
  .transform((d) => ({
    fazendaId: d.fazendaId,
    nome: d.nome,
    areaHa: d.unidade === "tarefas" ? tarefasParaHa(d.area) : d.area,
  }));

export const usinaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da usina").max(80),
  modelo: z.enum(MODELOS_USINA, { error: "Selecione o modelo de remuneração" }),
});

export const colheitaSchema = z.object({
  talhaoId: z.string().min(1, "Selecione o talhão"),
  usinaId: z.string().min(1, "Selecione a usina"),
  data: z.string().min(1, "Informe a data"),
  tipo: z.enum(TIPOS, { error: "Selecione o tipo de colheita" }),
  toneladas: numField("Toneladas"),

  valorTonelada: numeroOpcional("Valor da tonelada"),
  complemento: numeroOpcional("Complemento/ágio"),
  complementoTipo: z.enum(COMPLEMENTO_TIPOS).optional().default("total"),

  atrPorTonelada: numeroOpcional("ATR por tonelada"),
  precoKgAtr: numeroOpcional("Preço do kg de ATR"),
  outrosAdicionais: numeroOpcional("Outros adicionais"),

  despCorte: moedaField("Corte"),
  despTransporte: moedaField("Transporte"),
  despOutrasColheita: moedaField("Outras despesas de colheita"),
  despPlantioUsina: moedaField("Plantio com a usina"),
  despArrendamento: moedaField("Arrendamento"),
  despAdubacao: moedaField("Adubação"),
  despHerbicida: moedaField("Herbicida"),
  despOutras: moedaField("Outras despesas"),

  observacao: optionalField(300),
});

function numeroOpcional(label: string) {
  return z
    .string()
    .optional()
    .transform((v) => (v === undefined || v.trim() === "" ? null : parseDecimal(v)))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0), {
      message: `${label} inválido(a) ou negativo(a)`,
    });
}

function moedaField(label: string) {
  return z
    .string()
    .optional()
    .transform((v) => (v === undefined || v.trim() === "" ? 0 : parseDecimal(v)))
    .refine((v) => Number.isFinite(v) && v >= 0, {
      message: `${label} não pode ser negativo(a)`,
    });
}

export type FazendaInput = z.infer<typeof fazendaSchema>;
export type TalhaoInput = z.infer<typeof talhaoSchema>;
export type UsinaInput = z.infer<typeof usinaSchema>;
export type ColheitaInput = z.infer<typeof colheitaSchema>;

export function primeiraMensagem(res: z.ZodError): string {
  return res.issues[0]?.message ?? "Dados inválidos";
}