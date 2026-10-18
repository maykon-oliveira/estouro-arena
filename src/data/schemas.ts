import { z } from 'zod';
import { ABILITY_KICK, ABILITY_PASS_BLOCKS, ABILITY_PIERCE, ABILITY_REMOTE } from '../core/items';
import { BLOCK, FLOOR, SPAWN, WALL } from '../core/terrainIds';
import { msToTicks } from '../core/time';
import { GAME_EVENT_TYPES } from '../events';

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
  /** Esconde quem está dentro (só visual; ex.: mato alto). */
  hides: z.boolean().optional(),
  /** Quem entra desliza até bater ou sair (ex.: gelo). */
  slippery: z.boolean().optional(),
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
    match: z.strictObject({
      /** Vitórias de rodada para vencer a partida (melhor de 3 = 2). */
      winsToWin: PositiveInt,
      /** Relógio de cada rodada. */
      roundMs: z.number().positive(),
      /** Contagem "3, 2, 1" antes de cada rodada. */
      countdownMs: z.number().positive(),
      /** Espera depois de sobrar ≤ 1 vivo, antes de dar a rodada (quem morrer nela empata). */
      roundEndDelayMs: z.number().positive(),
    }),
    ghost: z.strictObject({
      /** Espera entre a morte e virar fantasma. */
      delayMs: z.number().min(0),
      /** Velocidade do fantasma no anel da borda. */
      speedTilesPerSecond: z.number().positive(),
      /** Distância mínima (em tiles, a partir da borda) do pouso do arremesso. */
      throwTiles: PositiveInt,
      /** Duração do voo da bomba arremessada. */
      flightMs: z.number().positive(),
    }),
    suddenDeath: z.strictObject({
      /** Últimos ms da rodada em que os tiles caem em espiral (0 = desligada). */
      durationMs: z.number().min(0),
    }),
    mount: z.strictObject({
      /** Invulnerabilidade depois de perder a montaria (para a mesma explosão não matar). */
      invulnerableMs: z.number().min(0),
    }),
    character: z.strictObject({
      /** Invulnerabilidade depois do escudo do personagem (Mula sem Cabeça). */
      shieldInvulnerableMs: z.number().min(0),
    }),
    hud: z.strictObject({
      /** Quanto tempo o "Já!" fica na tela depois da contagem. */
      goBannerMs: z.number().min(0),
      /** Quanto tempo o aviso "Morte súbita!" fica na tela. */
      suddenDeathBannerMs: z.number().min(0),
    }),
    bomb: z.strictObject({
      fuseMs: z.number().positive(),
      explosionMs: z.number().positive(),
      /** Velocidade da bomba chutada. */
      kickSpeedTilesPerSecond: z.number().positive(),
    }),
    player: z.strictObject({
      speedTilesPerSecond: z.number().positive(),
      /** Quanto (em tiles) a assistência de curva pode deslizar o jogador até a faixa livre. */
      cornerAssistTiles: z.number().min(0).max(1),
      startBombs: PositiveInt,
      startRange: PositiveInt,
      /** Limites dos power-ups. */
      maxBombs: PositiveInt,
      maxRange: PositiveInt,
      /** Tiles/s a mais por nível de patins. */
      speedStep: z.number().min(0),
      maxSpeedLevel: z.number().int().min(0),
    }),
    items: z.strictObject({
      /** Itens escondidos nos blocos quando a fase não define `blocos.itens`. */
      defaultDistribution: z.record(ContentId, z.number().int().min(0)),
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
      /** Diâmetro do botão de ação (menor que o de bomba). */
      actionButtonPx: z.number().int().min(56),
    }),
    render: z.strictObject({
      tileSize: PositiveInt,
      width: PositiveInt,
      height: PositiveInt,
      /** Distância (px do jogo) do topo até a arena, para a barra do HUD não cobri-la. */
      boardTop: z.number().int().min(0),
      /** Cor de cada jogador por id (`#rrggbb`); precisa cobrir todos os spawns usados. */
      playerColors: z.array(z.string().regex(/^#[0-9a-f]{6}$/i, 'cor deve ser #rrggbb')).min(4),
    }),
  })
  .superRefine((cfg, ctx) => {
    if (cfg.player.maxBombs < cfg.player.startBombs) {
      ctx.addIssue({
        code: 'custom',
        message: 'maxBombs < startBombs',
        path: ['player', 'maxBombs'],
      });
    }
    if (cfg.player.maxRange < cfg.player.startRange) {
      ctx.addIssue({
        code: 'custom',
        message: 'maxRange < startRange',
        path: ['player', 'maxRange'],
      });
    }
    for (const key of ['fuseMs', 'explosionMs'] as const) {
      if (msToTicks(cfg.bomb[key], cfg.tickRate) < 1) {
        ctx.addIssue({ code: 'custom', message: 'duração menor que um tick', path: ['bomb', key] });
      }
    }
    for (const key of ['roundMs', 'countdownMs', 'roundEndDelayMs'] as const) {
      if (msToTicks(cfg.match[key], cfg.tickRate) < 1) {
        ctx.addIssue({
          code: 'custom',
          message: 'duração menor que um tick',
          path: ['match', key],
        });
      }
    }
  });

const Amount = z.number().int().positive();

/** Habilidades que o core conhece (dadas pelo efeito `ability`). */
const AbilityId = z.enum([ABILITY_PIERCE, ABILITY_PASS_BLOCKS, ABILITY_KICK, ABILITY_REMOTE]);

/** Um item de src/data/items.json; `effect` escolhe o handler do core (src/core/items.ts). */
export const ItemSchema = z.discriminatedUnion('effect', [
  z.strictObject({ id: ContentId, effect: z.literal('extra_bomb'), amount: Amount }),
  z.strictObject({ id: ContentId, effect: z.literal('extra_range'), amount: Amount }),
  z.strictObject({ id: ContentId, effect: z.literal('max_range') }),
  z.strictObject({ id: ContentId, effect: z.literal('extra_speed'), amount: Amount }),
  z.strictObject({ id: ContentId, effect: z.literal('ability'), ability: AbilityId }),
  /** Ovo: monta na montaria `mount` (id de src/data/mounts.json). */
  z.strictObject({ id: ContentId, effect: z.literal('mount'), mount: ContentId }),
]);

const TerrainOverrideSchema = z.strictObject({
  walkable: z.boolean().optional(),
  speedMultiplier: z.number().min(0).max(3).optional(),
});

/** Montaria de src/data/mounts.json (ver docs/specs/montarias.md). */
export const MountSchema = z.discriminatedUnion('ability', [
  z.strictObject({
    id: ContentId,
    ability: z.null(),
    terrainOverrides: z.record(ContentId, TerrainOverrideSchema),
  }),
  z.strictObject({
    id: ContentId,
    ability: z.literal('jump'),
    /** Distância do pulo, em tiles. */
    jumpTiles: z.number().int().min(1),
    jumpMs: z.number().positive(),
    cooldownMs: z.number().min(0),
    terrainOverrides: z.record(ContentId, TerrainOverrideSchema),
  }),
]);

export const MountsSchema = z.array(MountSchema);
export type MountData = z.infer<typeof MountSchema>;

/** Personagem de src/data/characters.json (ver docs/specs/personagens-e-passivas.md). */
export const CharacterSchema = z.strictObject({
  id: ContentId,
  /** Passiva: só dados, aplicados ao nascer (campos opcionais). */
  passive: z.strictObject({
    speedLevel: z.number().int().min(1).optional(),
    range: z.number().int().min(1).optional(),
    abilities: z.array(AbilityId).optional(),
    terrainOverrides: z.record(ContentId, TerrainOverrideSchema).optional(),
    flameShields: z.number().int().min(1).optional(),
    hiddenWhileMoving: z.boolean().optional(),
  }),
});

export const CharactersSchema = z
  .array(CharacterSchema)
  .min(1)
  .superRefine((list, ctx) => {
    const seen = new Set<string>();
    list.forEach((c, i) => {
      if (seen.has(c.id)) {
        ctx.addIssue({ code: 'custom', message: `personagem duplicado: ${c.id}`, path: [i, 'id'] });
      }
      seen.add(c.id);
    });
  });
export type CharacterData = z.infer<typeof CharacterSchema>;

export const ItemsSchema = z.array(ItemSchema).superRefine((items, ctx) => {
  const seen = new Set<string>();
  items.forEach((item, i) => {
    if (seen.has(item.id)) {
      ctx.addIssue({ code: 'custom', message: `item duplicado: ${item.id}`, path: [i, 'id'] });
    }
    seen.add(item.id);
  });
});

/** Valida que toda chave de uma distribuição de itens existe no catálogo. */
export function checkItemIds(
  counts: Readonly<Record<string, number>> | undefined,
  itemIds: ReadonlySet<string>,
  ctx: z.RefinementCtx,
  path: (string | number)[],
): void {
  for (const id of Object.keys(counts ?? {})) {
    if (!itemIds.has(id)) {
      ctx.addIssue({ code: 'custom', message: `item inexistente: ${id}`, path: [...path, id] });
    }
  }
}

/**
 * Schema de fase (GDD §4). Recebe os ids de terreno conhecidos para validar a legenda e, se
 * houver, os ids de item para validar `blocos.itens`.
 */
export function createMapSchema(
  terrainIds: ReadonlySet<string>,
  itemIds: ReadonlySet<string> = new Set(),
) {
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
      checkItemIds(map.blocos.itens, itemIds, ctx, ['blocos', 'itens']);
    });
}

export type Terrain = z.infer<typeof TerrainSchema>;
export type GameConfig = z.infer<typeof GameConfigSchema>;
export type MapData = z.infer<ReturnType<typeof createMapSchema>>;

/** Evento do jogo → id do som. Chave que não é evento conhecido é erro (digitação). */
export const SoundsSchema = z.partialRecord(z.enum(GAME_EVENT_TYPES), z.string().min(1));

const Chance = z.number().min(0).max(1);

/** Níveis dos bots (src/data/bots.json). Ver docs/specs/bots.md. */
export const BotsSchema = z.strictObject({
  /** Folga, dos dois lados do perigo previsto, que as rotas dos bots respeitam. */
  escapeMarginMs: z.number().min(0),
  /** Morte súbita: quantos ms à frente o bot enxerga a queda dos tiles. */
  collapseHorizonMs: z.number().min(0),
  levels: z.record(
    ContentId,
    z.strictObject({
      /** Intervalo entre decisões. */
      reactionMs: z.number().positive(),
      /** Chance, por bomba, de pular a checagem de fuga. */
      mistakeChance: Chance,
      /** Chance, por decisão, de caçar antes de abrir caminho. */
      aggression: Chance,
      /** Distância máxima até um item para ir buscá-lo. */
      itemSearchTiles: z.number().int().min(0),
    }),
  ),
});

export type BotsData = z.infer<typeof BotsSchema>;

/**
 * Manifest do tema (assets/themes/<tema>/manifest.json): nome lógico → arquivos.
 * `source` registra de onde a arte veio (ex.: `dicebear:loops`).
 */
export const ThemeManifestSchema = z.record(
  z.string().regex(/^[a-z]+(\.[a-z0-9_]+)+$/, 'nome lógico como tile.agua_rasa'),
  z.strictObject({
    files: z.array(z.string().regex(/^[a-z0-9_/]+\.(svg|png)$/)).min(1),
    source: z.string().optional(),
  }),
);
export type ThemeManifest = z.infer<typeof ThemeManifestSchema>;

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
