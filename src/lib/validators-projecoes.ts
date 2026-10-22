import { z } from "zod";
import { parseDecimal } from "./format";
import { normalizarSafra, MENSAGEM_SAFRA_INVALIDA } from "./safra";

const itemCustoSchema = z.object({
  nome: z.string().trim().min(1, "Informe a descrição do custo").max(60),
  valor: z.number().min(0, "Valor não pode ser negativo").finite("Valor inválido"),
  unidade: z.enum(["ha", "total"], { error: "Unidade inválida" }),
});

export const custosJson = () =>
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
            (i): i is Record<string, unknown> =>
              !!i && typeof i === "object" && typeof i.nome === "string",
          )
          .map((i) => ({
            nome: String(i.nome).trim(),
            valor: Number(i.valor) || 0,
            unidade: i.unidade === "ha" ? "ha" : "total",
          }));
      } catch {
        return [];
      }
    })
    .pipe(z.array(itemCustoSchema));

export const TIPOS_SERVICO_ENUM = [
  "plantio",
  "adubacao",
  "herbicida",
  "defensivo",
  "tratos-culturais",
  "preparo-solo",
  "cultivo",
  "outro",
] as const;

export const TIPOS_EXECUCAO_ENUM = ["propria", "terceirizada", "usina"] as const;

export const projecaoServicoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da comparação").max(80),
  safra: z
    .string()
    .trim()
    .max(30)
    .optional()
    .refine((v) => !v || Boolean(normalizarSafra(v)), { message: MENSAGEM_SAFRA_INVALIDA }),
  fazendaId: z.string().optional(),
  tipo: z.enum(TIPOS_SERVICO_ENUM, { error: "Selecione o tipo de serviço" }),
  tipoExecucao: z.enum(TIPOS_EXECUCAO_ENUM, { error: "Selecione quem executa" }),
  areaHa: z
    .string()
    .optional()
    .transform((v) => (v ? parseDecimal(v) : 0))
    .refine((v) => v === 0 || (Number.isFinite(v) && v >= 0), { message: "Área inválida" }),
  produtividade: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? parseDecimal(v) : null))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0), { message: "Produtividade inválida" }),
  preco: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? parseDecimal(v) : null))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0), { message: "Preço inválido" }),
  custos: custosJson(),
});

export const projecaoProtocoloSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do protocolo").max(80),
  safra: z
    .string()
    .trim()
    .max(30)
    .optional()
    .refine((v) => !v || Boolean(normalizarSafra(v)), { message: MENSAGEM_SAFRA_INVALIDA }),
  fazendaId: z.string().optional(),
  areaHa: z
    .string()
    .min(1, "Informe a área")
    .transform((v) => parseDecimal(v))
    .refine((v) => Number.isFinite(v) && v > 0, { message: "Informe a área maior que zero" }),
  produtividade: z
    .string()
    .min(1, "Informe a produtividade")
    .transform((v) => parseDecimal(v))
    .refine((v) => Number.isFinite(v) && v > 0, { message: "Informe a produtividade maior que zero" }),
  preco: z
    .string()
    .min(1, "Informe o preço")
    .transform((v) => parseDecimal(v))
    .refine((v) => Number.isFinite(v) && v > 0, { message: "Informe o preço maior que zero" }),
  cortes: z
    .string()
    .optional()
    .transform((v) => (v ? Math.max(1, Math.round(parseDecimal(v)) || 1) : 1)),
  custos: custosJson(),
});

export type ProjecaoServicoInput = z.infer<typeof projecaoServicoSchema>;
export type ProjecaoProtocoloInput = z.infer<typeof projecaoProtocoloSchema>;