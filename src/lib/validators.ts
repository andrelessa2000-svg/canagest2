import { z } from "zod";
import { parseDecimal, tarefasParaHa, UNIDADES_AREA } from "./format";
import { MODELOS_USINA } from "./colheita";

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

const itemDespesaSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome da despesa").max(60),
  valor: z.number().min(0, "Valor não pode ser negativo").finite("Valor inválido"),
});

const itensJson = () =>
  z
    .string()
    .optional()
    .transform((v) => {
      if (!v || v.trim() === "") return [];
      try {
        const arr = JSON.parse(v);
        if (!Array.isArray(arr)) return [];
        return arr
          .filter(
            (i) =>
              (typeof i?.nome === "string" && i.nome.trim() !== "") ||
              (typeof i?.valor === "string" && i.valor.trim() !== ""),
          )
          .map((i) => {
            const nome = (typeof i?.nome === "string" ? i.nome : "").trim();
            const raw = typeof i?.valor === "string" ? i.valor : String(i?.valor ?? "");
            const parsed = parseDecimal(raw);
            return { nome, valor: Number.isFinite(parsed) ? parsed : 0 };
          });
      } catch {
        return [];
      }
    })
    .pipe(z.array(itemDespesaSchema));

const ligaField = () =>
  z
    .string()
    .optional()
    .transform((v) => v === "on");

export const colheitaSchema = z.object({
  fazendaId: z.string().min(1, "Selecione a fazenda"),
  usinaId: z.string().min(1, "Selecione a usina"),
  data: z.string().min(1, "Informe a data"),
  tipo: z.enum(TIPOS, { error: "Selecione o tipo de colheita" }),
  safra: optionalField(30),
  toneladas: numField("Toneladas"),

  precoCana: numeroOpcional("Preço da cana"),
  agio: numeroOpcional("Ágio"),
  atrPorTonelada: numeroOpcional("ATR por tonelada"),
  precoKgAtr: numeroOpcional("Preço do kg de ATR"),

  ctc: moedaField("CTC"),

  areaColhida: numeroOpcional("Área colhida"),

  arrendar: ligaField(),
  tonsPorTarefa: numeroOpcional("Toneladas por tarefa"),
  tarefasArrendadas: numeroOpcional("Tarefas arrendadas"),

  adubo: ligaField(),
  precoTonAdubo: numeroOpcional("Preço da tonelada de adubo"),
  tarefasAdubo: numeroOpcional("Tarefas com adubo"),

  herbicidas: itensJson(),
  insumos: itensJson(),
  despesasUsina: itensJson(),

  observacao: optionalField(300),
});

export const TIPOS_PLANTIO = ["planta", "reforma"] as const;
export const TIPOS_PLANTIO_LABEL: Record<string, string> = {
  planta: "Cana planta",
  reforma: "Reforma",
};

export const plantioSchema = z.object({
  fazendaId: z.string().min(1, "Selecione a fazenda"),
  talhaoId: z.string().optional(),
  safra: optionalField(30),
  tipo: z.enum(TIPOS_PLANTIO, { error: "Selecione o tipo de plantio" }),
  data: z.string().min(1, "Informe a data"),
  valor: moedaField("Valor do plantio"),
  projecao: ligaField(),
  areaHa: numeroOpcional("Área"),
  valorPorHa: numeroOpcional("Valor por ha"),
  observacao: optionalField(300),
});

export const TIPOS_TRATO = [
  "adubacao",
  "herbicida",
  "formicida",
  "insecticida",
  "cultivo",
  "soqueira",
  "outro",
] as const;
export const TIPOS_TRATO_LABEL: Record<string, string> = {
  adubacao: "Adubação",
  herbicida: "Herbicida",
  formicida: "Formicida",
  insecticida: "Inseticida",
  cultivo: "Cultivo",
  soqueira: "Cortador de soqueira",
  outro: "Outro",
};

export const ESCOPOS_TRATO = ["fazenda", "talhao", "parte"] as const;
export const ESCOPOS_TRATO_LABEL: Record<string, string> = {
  fazenda: "Fazenda inteira",
  talhao: "Talhão específico",
  parte: "Parte do talhão",
};

const produtoSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do produto").max(60),
  dose: z.string().trim().max(20),
  unidade: z.string().trim().max(10),
  quantidade: z.number().min(0, "Quantidade inválida").finite("Quantidade inválida"),
});

const produtosJson = () =>
  z
    .string()
    .optional()
    .transform((v) => {
      if (!v || v.trim() === "") return [];
      try {
        const arr = JSON.parse(v);
        if (!Array.isArray(arr)) return [];
        return arr
          .filter((i) => typeof i?.nome === "string" && i.nome.trim() !== "")
          .map((i) => ({
            nome: (typeof i?.nome === "string" ? i.nome : "").trim(),
            dose: typeof i?.dose === "string" ? i.dose : "",
            unidade: typeof i?.unidade === "string" ? i.unidade : "",
            quantidade: Number.isFinite(Number(i?.quantidade)) ? Number(i.quantidade) : 0,
          }));
      } catch {
        return [];
      }
    })
    .pipe(z.array(produtoSchema));

export const tratoSchema = z.object({
  fazendaId: z.string().min(1, "Selecione a fazenda"),
  talhaoId: z.string().optional(),
  safra: optionalField(30),
  tipo: z.enum(TIPOS_TRATO, { error: "Selecione o tipo de trato" }),
  escopo: z.enum(ESCOPOS_TRATO, { error: "Selecione o escopo" }),
  tarefas: numeroOpcional("Tarefas"),
  data: z.string().min(1, "Informe a data"),
  valor: moedaField("Valor do trato"),
  projecao: ligaField(),
  produtos: produtosJson(),
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
export type PlantioInput = z.infer<typeof plantioSchema>;
export type TratoInput = z.infer<typeof tratoSchema>;

export function primeiraMensagem(res: z.ZodError): string {
  return res.issues[0]?.message ?? "Dados inválidos";
}