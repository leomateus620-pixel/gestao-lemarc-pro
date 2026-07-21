import { z } from "zod";

export const wireTrayCategorySchema = z.enum([
  "straight_tray",
  "curve",
  "branch",
  "reduction",
  "splice",
  "support",
  "cover",
  "accessory",
  "other",
]);
export const wireTrayUnitSchema = z.enum(["piece", "meter", "kilogram", "set"]);

const optionalNumber = z
  .union([z.number(), z.nan(), z.null(), z.undefined()])
  .transform((value) =>
    value === null || value === undefined || Number.isNaN(value) ? null : value,
  );

export const wireTrayProductInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    sku: z.string().trim().max(80).nullable().optional(),
    name: z.string().trim().min(2, "Informe o nome do produto.").max(180),
    category: wireTrayCategorySchema,
    unit: wireTrayUnitSchema,
    active: z.boolean().default(true),
    shortDescription: z.string().trim().max(500).nullable().optional(),
    widthMm: optionalNumber.refine((v) => v === null || v >= 0, "A largura não pode ser negativa."),
    heightMm: optionalNumber.refine((v) => v === null || v >= 0, "A altura não pode ser negativa."),
    lengthMm: optionalNumber.refine(
      (v) => v === null || v >= 0,
      "O comprimento não pode ser negativo.",
    ),
    material: z.string().trim().max(120).nullable().optional(),
    finish: z.string().trim().max(120).nullable().optional(),
    technicalNotes: z.string().trim().max(3000).nullable().optional(),
    defaultLocationId: z.string().uuid().nullable().optional(),
    minimumStock: z.number().min(0, "O estoque mínimo não pode ser negativo."),
    targetStock: optionalNumber.refine(
      (v) => v === null || v >= 0,
      "O estoque-alvo não pode ser negativo.",
    ),
    minimumProductionBatch: z.number().positive("O lote mínimo deve ser maior que zero."),
    automaticReplenishment: z.boolean(),
    replenishmentNotes: z.string().trim().max(1000).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.targetStock !== null && value.targetStock < value.minimumStock) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetStock"],
        message: "O estoque-alvo não pode ser menor que o mínimo.",
      });
    }
    if (value.automaticReplenishment && value.minimumProductionBatch <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minimumProductionBatch"],
        message: "Defina um lote mínimo para a reposição automática.",
      });
    }
  });

export const wireTrayOrderDraftSchema = z
  .object({
    id: z.string().uuid().nullable().optional(),
    clientId: z.string().uuid("Selecione um cliente."),
    clientUnitId: z.string().uuid().nullable().optional(),
    customerOrderReference: z.string().trim().max(120).nullable().optional(),
    quotationReference: z.string().trim().max(120).nullable().optional(),
    priority: z.enum(["baixa", "media", "alta", "urgente"]),
    expectedDeliveryDate: z.string().date().nullable().optional(),
    operationalNotes: z.string().trim().max(3000).nullable().optional(),
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          quantity: z.number().positive("A quantidade deve ser maior que zero."),
          notes: z.string().trim().max(500).nullable().optional(),
          unitPriceCents: z.number().int().min(0).nullable().optional(),
          sortOrder: z.number().int().min(0),
        }),
      )
      .min(1, "Adicione ao menos um produto."),
  })
  .superRefine((value, ctx) => {
    const productIds = new Set<string>();
    value.items.forEach((item, index) => {
      if (productIds.has(item.productId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "productId"],
          message: "O produto já foi adicionado ao pedido.",
        });
      }
      productIds.add(item.productId);
    });
  });

export type WireTrayProductInput = z.infer<typeof wireTrayProductInputSchema>;
export type WireTrayOrderDraftInput = z.infer<typeof wireTrayOrderDraftSchema>;
