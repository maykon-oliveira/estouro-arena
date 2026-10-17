import { describe, expect, it } from 'vitest';
import type { MapDefinition } from '../../src/core/grid';
import { checkMapLayout } from '../../src/core/mapCheck';
import { gameConfig, maps, terrains } from '../../src/data';
import { testTerrains } from './helpers';

const legenda = {
  '#': 'parede',
  '.': 'chao',
  P: 'spawn',
  '~': 'agua_rasa',
  '=': 'agua_funda',
  '"': 'mato_alto',
  '*': 'gelo',
  B: 'bloco',
};

const mapOf = (mapa: string[]): MapDefinition => ({
  tamanho: [mapa[0]?.length ?? 0, mapa.length],
  legenda,
  mapa,
  blocos: { densidade: 0.5 },
});

const good = ['#######', '#P...P#', '#.#.#.#', '#.....#', '#.#.#.#', '#P...P#', '#######'];

describe('checkMapLayout', () => {
  it('aceita um mapa com 4 spawns ligados e áreas seguras jogáveis', () => {
    expect(checkMapLayout(mapOf(good), testTerrains, 1)).toEqual([]);
  });

  it('exige pelo menos 4 spawns', () => {
    const three = good.map((row, y) => (y === 5 ? '#P....#' : row));
    expect(checkMapLayout(mapOf(three), testTerrains, 1)).toEqual([
      'precisa de pelo menos 4 spawns (tem 3)',
    ]);
  });

  it('rejeita área segura sobre gelo ou água rasa', () => {
    const icy = good.map((row, y) => (y === 1 ? '#P*..P#' : row));
    expect(checkMapLayout(mapOf(icy), testTerrains, 1)).toEqual([
      'área segura do spawn (1,1) tem tile sem bomba ou escorregadio em (2,1)',
    ]);
    const wet = good.map((row, y) => (y === 5 ? '#P..~P#' : row));
    expect(checkMapLayout(mapOf(wet), testTerrains, 1)).toEqual([
      'área segura do spawn (5,5) tem tile sem bomba ou escorregadio em (4,5)',
    ]);
  });

  it('rejeita spawn sem espaço para soltar a primeira bomba', () => {
    const tight = good.map((row, y) => (y === 2 ? '###.#.#' : row));
    expect(checkMapLayout(mapOf(tight), testTerrains, 1)).toContain(
      'área segura do spawn (1,1) tem só 2 tiles andáveis (mínimo 3)',
    );
  });

  it('rejeita spawn isolado por água funda', () => {
    const island = ['#######', '#P.=.P#', '#.#=#.#', '#..=..#', '#.#=#.#', '#P.=.P#', '#######'];
    const errors = checkMapLayout(mapOf(island), testTerrains, 1);
    expect(errors).toEqual(['spawns isolados: (5,1), (5,5) não alcançam (1,1)']);
  });

  it('blocos e mato contam como passagem (serão quebrados)', () => {
    const blocked = ['#######', '#P.B.P#', '#.#"#.#', '#..B..#', '#.#B#.#', '#P.".P#', '#######'];
    expect(checkMapLayout(mapOf(blocked), testTerrains, 1)).toEqual([]);
  });
});

describe('fases reais (src/data/maps)', () => {
  it('as 3 fases da Fase 1 existem e passam na checagem', () => {
    expect([...maps.keys()].sort()).toEqual(['arena_01', 'pantanal_01', 'tundra_01']);
    for (const map of maps.values()) {
      expect(checkMapLayout(map, terrains, gameConfig.map.spawnSafeRadius), map.id).toEqual([]);
    }
  });

  it('cada fase usa os terrenos do seu bioma', () => {
    const ids = (id: string) => {
      const map = maps.get(id);
      if (!map) throw new Error(id);
      const used = new Set<string>();
      for (const row of map.mapa) for (const c of row) used.add(map.legenda[c] ?? '?');
      return used;
    };
    expect([...ids('pantanal_01')]).toEqual(
      expect.arrayContaining(['agua_rasa', 'agua_funda', 'mato_alto', 'lama']),
    );
    expect([...ids('tundra_01')]).toEqual(expect.arrayContaining(['gelo', 'agua_funda', 'lama']));
    expect(maps.get('arena_01')?.blocos.itens).toEqual(gameConfig.items.defaultDistribution);
  });
});
