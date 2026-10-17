// Ponto único de carga do conteúdo: todo JSON passa pelo schema Zod aqui.
import botsJson from './bots.json';
import gameJson from './game.json';
import itemsJson from './items.json';
import mountsJson from './mounts.json';
import soundsJson from './sounds.json';
import stringsJson from './strings.pt-BR.json';
import terrainsJson from './terrains.json';
import type { BotConfig } from '../core/bots/bot';
import type { ItemDef } from '../core/items';
import { checkMapLayout } from '../core/mapCheck';
import type { MountDef } from '../core/mounts';
import { botConfigsFromData, mountDefFromData } from './rules';
import {
  BotsSchema,
  GameConfigSchema,
  ItemsSchema,
  MountsSchema,
  SoundsSchema,
  StringsSchema,
  TerrainsSchema,
  createMapSchema,
  parseContent,
  type MapData,
  type Terrain,
} from './schemas';

export const gameConfig = parseContent(GameConfigSchema, gameJson, 'src/data/game.json');

const terrainList = parseContent(TerrainsSchema, terrainsJson, 'src/data/terrains.json');

export const terrains: ReadonlyMap<string, Terrain> = new Map(terrainList.map((t) => [t.id, t]));

// Toda fase em src/data/maps/ é carregada e validada; o id vem do conteúdo, não do nome do arquivo.
const itemList = parseContent(ItemsSchema, itemsJson, 'src/data/items.json');

/** Catálogo de itens por id (src/data/items.json). */
export const items: ReadonlyMap<string, ItemDef> = new Map(itemList.map((i) => [i.id, i]));

/** Montarias por id (src/data/mounts.json), com durações em ticks. */
export const mounts: ReadonlyMap<string, MountDef> = new Map(
  parseContent(MountsSchema, mountsJson, 'src/data/mounts.json').map((m) => [
    m.id,
    mountDefFromData(m, gameConfig.tickRate),
  ]),
);

for (const item of items.values()) {
  if (item.effect === 'mount' && !mounts.has(item.mount)) {
    throw new Error(`src/data/items.json: ${item.id} usa montaria inexistente: ${item.mount}`);
  }
}

for (const id of Object.keys(gameConfig.items.defaultDistribution)) {
  if (!items.has(id)) {
    throw new Error(`src/data/game.json: items.defaultDistribution usa item inexistente: ${id}`);
  }
}

const mapSchema = createMapSchema(new Set(terrains.keys()), new Set(items.keys()));
const mapFiles = import.meta.glob<unknown>('./maps/*.json', { eager: true, import: 'default' });

export const maps: ReadonlyMap<string, MapData> = new Map(
  Object.entries(mapFiles).map(([path, raw]) => {
    const map = parseContent(mapSchema, raw, `src/data/${path.slice(2)}`);
    return [map.id, map];
  }),
);

// Fase jogável: spawns, área segura e ligação (ver docs/specs/mapas-fase-1.md).
for (const map of maps.values()) {
  const errors = checkMapLayout(map, terrains, gameConfig.map.spawnSafeRadius);
  if (errors.length > 0) {
    throw new Error(`src/data/maps/${map.id}.json:\n- ${errors.join('\n- ')}`);
  }
}

if (!maps.has(gameConfig.map.default)) {
  throw new Error(`src/data/game.json: map.default '${gameConfig.map.default}' não existe`);
}

/** Níveis dos bots por id, já em ticks. */
export const botConfigs: ReadonlyMap<string, BotConfig> = botConfigsFromData(
  parseContent(BotsSchema, botsJson, 'src/data/bots.json'),
  gameConfig.tickRate,
);

export const sounds = parseContent(SoundsSchema, soundsJson, 'src/data/sounds.json');

const strings = parseContent(StringsSchema, stringsJson, 'src/data/strings.pt-BR.json');

export type StringKey = keyof typeof stringsJson;

/**
 * Texto do jogo pela chave (pronto para trocar de idioma depois).
 * `{nome}` no texto é trocado por `vars.nome` (ex.: `t('round.win', { player: 'Azul' })`).
 */
export function t(key: StringKey, vars: Readonly<Record<string, string | number>> = {}): string {
  const text = strings[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}

export type { GameConfig, MapData, Terrain } from './schemas';
