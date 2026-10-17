// Ponto único de carga do conteúdo: todo JSON passa pelo schema Zod aqui.
import gameJson from './game.json';
import terrainsJson from './terrains.json';
import { GameConfigSchema, TerrainsSchema, parseContent, type Terrain } from './schemas';

export const gameConfig = parseContent(GameConfigSchema, gameJson, 'src/data/game.json');

const terrainList = parseContent(TerrainsSchema, terrainsJson, 'src/data/terrains.json');

export const terrains: ReadonlyMap<string, Terrain> = new Map(terrainList.map((t) => [t.id, t]));

export type { GameConfig, Terrain } from './schemas';
