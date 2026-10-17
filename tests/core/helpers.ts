import type { MapDefinition } from '../../src/core/grid';
import { createWorld, type Rules, type TerrainRules, type World } from '../../src/core/world';

export const testTerrains: ReadonlyMap<string, TerrainRules> = new Map([
  ['chao', { walkable: true, speedMultiplier: 1 }],
  ['parede', { walkable: false, speedMultiplier: 1 }],
  ['bloco', { walkable: false, speedMultiplier: 1 }],
  ['lama', { walkable: true, speedMultiplier: 0.5 }],
]);

/** 6 tiles/s a 60 ticks/s = 0,1 tile por tick, para contas fáceis. */
export const testRules: Rules = {
  tickRate: 60,
  playerSpeed: 6,
  cornerAssistTiles: 0.5,
  spawnSafeRadius: 0,
};

/** Mapa ASCII sem blocos sorteados: `#` parede, `.` chão, `~` lama, `P` spawn. */
export function worldFrom(mapa: string[], players = 1): World {
  const map: MapDefinition = {
    tamanho: [mapa[0]?.length ?? 0, mapa.length],
    legenda: { '#': 'parede', '.': 'chao', '~': 'lama', P: 'spawn' },
    mapa,
    blocos: { densidade: 0 },
  };
  return createWorld({ map, terrains: testTerrains, rules: testRules, seed: 1, players });
}
