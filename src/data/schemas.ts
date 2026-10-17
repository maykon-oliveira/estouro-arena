import { z } from 'zod';
import { msToTicks } from '../core/time';

/** Ids de conteúdo: snake_case em português (`agua_rasa`, `mato_alto`). */
export const ContentId = z
  .string()
  .regex(/^[a-z][a-z0-9]*(_[a-z0-9]+)*$/, 'id deve ser snake_case');

const PositiveInt = z.number().int().positive();

export const TerrainSchema = z.strictObject({
  id: ContentId,
  /** Jogador pode entrar no tile. */
  walkable: z.boolean(),
  /** A explosão para neste tile. */
  blocksFire: z.boolean(),
  /** A explosão destrói o tile (vira `chao`). */
  destructible: z.boolean(),
  /** Pode-se soltar bomba neste tile. */
  allowsBomb: z.boolean(),
  /** Multiplica a velocidade de quem está no tile. */
  speedMultiplier: z.number().min(0).max(3),
});

/** Terrenos que o motor usa diretamente (geração de mapa, blocos destruídos). */
export const REQUIRED_TERRAINS = ['chao', 'parede', 'bloco'] as const;

export const TerrainsSchema = z.array(TerrainSchema).superRefine((terrains, ctx) => {
  const seen = new Set<string>();
  terrains.forEach((t, i) => {
    if (seen.has(t.id)) {
      ctx.addIssue({ code: 'custom', message: `terreno duplicado: ${t.id}`, path: [i, 'id'] });
    }
    seen.add(t.id);
  });
  for (const id of REQUIRED_TERRAINS) {
    if (!seen.has(id))
      ctx.addIssue({ code: 'custom', message: `terreno obrigatório ausente: ${id}` });
  }
});

export const GameConfigSchema = z
  .strictObject({
    tickRate: PositiveInt,
    grid: z.strictObject({
      cols: z.number().int().min(5),
      rows: z.number().int().min(5),
    }),
    bomb: z.strictObject({
      fuseMs: z.number().positive(),
      explosionMs: z.number().positive(),
    }),
    player: z.strictObject({
      speedTilesPerSecond: z.number().positive(),
      startBombs: PositiveInt,
      startRange: PositiveInt,
    }),
    render: z.strictObject({
      tileSize: PositiveInt,
      width: PositiveInt,
      height: PositiveInt,
    }),
  })
  .superRefine((cfg, ctx) => {
    for (const key of ['fuseMs', 'explosionMs'] as const) {
      if (msToTicks(cfg.bomb[key], cfg.tickRate) < 1) {
        ctx.addIssue({ code: 'custom', message: 'duração menor que um tick', path: ['bomb', key] });
      }
    }
  });

export type Terrain = z.infer<typeof TerrainSchema>;
export type GameConfig = z.infer<typeof GameConfigSchema>;

/** Valida um JSON de conteúdo e falha com mensagem legível, indicando o arquivo. */
export function parseContent<T>(schema: z.ZodType<T>, raw: unknown, source: string): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Dados inválidos em ${source}:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
