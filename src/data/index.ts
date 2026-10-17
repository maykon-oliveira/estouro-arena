// Ponto único de carga do conteúdo: todo JSON passa pelo schema Zod aqui.
import gameJson from './game.json';
import soundsJson from './sounds.json';
import stringsJson from './strings.pt-BR.json';
import terrainsJson from './terrains.json';
import {
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

export const sounds = parseContent(SoundsSchema, soundsJson, 'src/data/sounds.json');

const strings = parseContent(StringsSchema, stringsJson, 'src/data/strings.pt-BR.json');

export type StringKey = keyof typeof stringsJson;

/** Texto do jogo pela chave (pronto para trocar de idioma depois). */
export function t(key: StringKey): string {
  return strings[key] ?? key;
}

export type { GameConfig, MapData, Terrain } from './schemas';
