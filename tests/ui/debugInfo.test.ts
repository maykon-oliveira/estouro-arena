import { describe, expect, it } from 'vitest';
import { debugInfo } from '../../src/ui/debugInfo';
import { dropBomb, hold, player, run, worldFrom } from '../core/helpers';

describe('debugInfo', () => {
  it('resume o estado do jogador local e da arena', () => {
    const world = worldFrom(['######', '#P.BB#', '######']);
    hold(world, 'right', 6); // x = 1,6
    dropBomb(world);
    const info = debugInfo(world, { seed: 42, mapId: 'teste', fps: 59.6 });
    expect(info).toEqual({
      fps: '60',
      tick: '7',
      seed: '42',
      map: 'teste',
      pos: '1.70, 1.00',
      tile: '2,1',
      alive: 'vivo',
      bombs: '1/1',
      range: '2',
      speed: '0',
      blocks: '2',
    });
  });

  it('mostra morto e conta blocos destruídos', () => {
    const world = worldFrom(['######', '#P.B.#', '######']);
    hold(world, 'right', 10); // (2,1), encostado no bloco
    dropBomb(world);
    run(world, 30); // explode (mata o jogador) e o bloco termina de queimar
    expect(player(world).alive).toBe(false);
    const info = debugInfo(world, { seed: 1, mapId: 'teste', fps: 60 });
    expect(info.alive).toBe('morto');
    expect(info.blocks).toBe('0');
  });
});

describe('isDebugEnabled', () => {
  it('só liga com debug=1', async () => {
    const { isDebugEnabled } = await import('../../src/ui/DebugPanel');
    expect(isDebugEnabled('?debug=1')).toBe(true);
    expect(isDebugEnabled('?seed=3&debug=1')).toBe(true);
    expect(isDebugEnabled('?debug=0')).toBe(false);
    expect(isDebugEnabled('')).toBe(false);
  });
});
