// Ponto único de carga do conteúdo: todo JSON passa pelo schema Zod aqui.
import botsJson from './bots.json';
import gameJson from './game.json';
import soundsJson from './sounds.json';
import stringsJson from './strings.pt-BR.json';
import terrainsJson from './terrains.json';
import type { BotConfig } from '../core/bots/bot';
import { botConfigsFromData } from './rules';
import {
  BotsSchema,
  GameConfigSchema,
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
const mapSchema = createMapSchema(new Set(terrains.keys()));
const mapFiles = import.meta.glob<unknown>('./maps/*.json', { eager: true, import: 'default' });

export const maps: ReadonlyMap<string, MapData> = new Map(
  Object.entries(mapFiles).map(([path, raw]) => {
    const map = parseContent(mapSchema, raw, `src/data/${path.slice(2)}`);
    return [map.id, map];
  }),
);

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
