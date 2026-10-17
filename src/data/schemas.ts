import { z } from 'zod';
import { BLOCK, FLOOR, SPAWN, WALL } from '../core/terrainIds';
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
export const REQUIRED_TERRAINS = [FLOOR, WALL, BLOCK] as const;

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
    /** Teto de ticks por quadro; o atraso além disso é descartado. */
    maxTicksPerFrame: PositiveInt,
    map: z.strictObject({
      /** Id da fase carregada por padrão. */
      default: ContentId,
      /** Distância Manhattan, a partir de cada spawn, em que não nascem blocos. */
      spawnSafeRadius: z.number().int().min(0),
    }),
    bomb: z.strictObject({
      fuseMs: z.number().positive(),
      explosionMs: z.number().positive(),
    }),
    player: z.strictObject({
      speedTilesPerSecond: z.number().positive(),
      /** Quanto (em tiles) a assistência de curva pode deslizar o jogador até a faixa livre. */
      cornerAssistTiles: z.number().min(0).max(1),
      startBombs: PositiveInt,
      startRange: PositiveInt,
    }),
    controls: z.strictObject({
      /** Raio do joystick virtual, em px de CSS. */
      joystickRadiusPx: PositiveInt,
      /** Fração do raio sem direção. */
      joystickDeadZone: z.number().min(0).max(0.9),
      /** Folga (fração) para trocar de eixo perto da diagonal. */
      joystickHysteresis: z.number().min(0).max(1),
      /** Diâmetro do botão de bomba; o GDD exige pelo menos 72 px. */
      bombButtonPx: z.number().int().min(72),
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

/** Schema de fase (GDD §4). Recebe os ids de terreno conhecidos para validar a legenda. */
export function createMapSchema(terrainIds: ReadonlySet<string>) {
  return z
    .strictObject({
      id: ContentId,
      bioma: ContentId,
      tamanho: z.tuple([z.number().int().min(1), z.number().int().min(1)]),
      legenda: z.record(z.string().length(1), z.string()),
      mapa: z.array(z.string()).min(1),
      blocos: z.strictObject({
        densidade: z.number().min(0).max(1),
        itens: z.record(ContentId, z.number().int().min(0)).optional(),
      }),
      musica: z.string().optional(),
    })
    .superRefine((map, ctx) => {
      const [cols, rows] = map.tamanho;
      for (const [char, id] of Object.entries(map.legenda)) {
        if (id !== SPAWN && !terrainIds.has(id)) {
          ctx.addIssue({
            code: 'custom',
            message: `legenda '${char}' aponta para terreno inexistente: ${id}`,
            path: ['legenda', char],
          });
        }
      }
      if (map.mapa.length !== rows) {
        ctx.addIssue({
          code: 'custom',
          message: `mapa tem ${map.mapa.length} linhas, esperado ${rows}`,
          path: ['mapa'],
        });
      }
      let spawns = 0;
      map.mapa.forEach((line, y) => {
        if (line.length !== cols) {
          ctx.addIssue({
            code: 'custom',
            message: `linha com ${line.length} colunas, esperado ${cols}`,
            path: ['mapa', y],
          });
        }
        [...line].forEach((char, x) => {
          const id = map.legenda[char];
          if (id === undefined) {
            ctx.addIssue({
              code: 'custom',
              message: `caractere '${char}' (coluna ${x}) não está na legenda`,
              path: ['mapa', y],
            });
          } else if (id === SPAWN) {
            spawns++;
          }
        });
      });
      if (spawns === 0) ctx.addIssue({ code: 'custom', message: 'mapa sem spawn', path: ['mapa'] });
    });
}

export type Terrain = z.infer<typeof TerrainSchema>;
export type GameConfig = z.infer<typeof GameConfigSchema>;
export type MapData = z.infer<ReturnType<typeof createMapSchema>>;

/** Textos do jogo: chave → texto. */
export const StringsSchema = z.record(z.string().min(1), z.string().min(1));

/** Valida um JSON de conteúdo e falha com mensagem legível, indicando o arquivo. */
export function parseContent<T>(schema: z.ZodType<T>, raw: unknown, source: string): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Dados inválidos em ${source}:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
