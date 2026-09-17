import { z } from "zod";
import { parseDecimal } from "./format";

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
  cidade: optionalField(60),
  uf: optionalField(2),
  areaTotalHa: numField("Área total"),
});

export const talhaoSchema = z.object({
  fazendaId: z.string().min(1, "Selecione a fazenda"),
  nome: z.string().trim().min(1, "Informe o nome do talhão").max(20),
  variedade: optionalField(40),
  areaHa: numField("Área do talhão"),
  dataPlantio: z.string().optional(),
});

export const colheitaSchema = z.object({
  talhaoId: z.string().min(1, "Selecione o talhão"),
  data: z.string().min(1, "Informe a data"),
  tipo: z.enum(TIPOS, { error: "Selecione o tipo de colheita" }),
  toneladas: numField("Toneladas"),
  observacao: optionalField(300),
});

export type FazendaInput = z.infer<typeof fazendaSchema>;
export type TalhaoInput = z.infer<typeof talhaoSchema>;
export type ColheitaInput = z.infer<typeof colheitaSchema>;

export function primeiraMensagem(res: z.ZodError): string {
  return res.issues[0]?.message ?? "Dados inválidos";
}