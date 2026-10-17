import { explosionTiles } from '../bombs';
import type { Bomb, World } from '../world';

/** "Sem perigo" (e "inalcançável" nas rotas): maior inteiro de 32 bits. */
export const SAFE = 0x7fffffff;

/**
 * Para cada tile (mesmo índice de `grid.tiles`), o intervalo `[start, end)`, em ticks a partir
 * de agora, em que ele terá chama. `start === SAFE` = sem perigo previsto.
 */
export interface DangerMap {
  start: Int32Array;
  end: Int32Array;
}

export function createDangerMap(size: number): DangerMap {
  return { start: new Int32Array(size), end: new Int32Array(size) };
}

/**
 * Preenche o mapa de perigo do mundo, considerando também `extra` (a bomba que o bot pensa em
 * soltar), sem alterar o mundo. Cadeias: uma bomba atingida por outra herda o menor tempo.
 */
export function computeDanger(world: World, danger: DangerMap, extra?: Bomb): void {
  const { start, end } = danger;
  start.fill(SAFE);
  end.fill(0);

  // Chamas acesas: perigo desde já até apagarem.
  world.flames.forEach((left, i) => {
    if (left > 0) mark(danger, i, 0, left);
  });

  const bombs = extra ? [...world.bombs, extra] : world.bombs;
  if (bombs.length === 0) return;

  const crosses = bombs.map((b) => explosionTiles(world, b, bombs));
  const times = bombs.map((b) => Math.max(0, b.fuse));

  // Relaxa até estabilizar: cada bomba atingida explode no menor tempo entre a dela e a de quem a atinge.
  let changed = true;
  while (changed) {
    changed = false;
    crosses.forEach((cross, i) => {
      const t = times[i] ?? SAFE;
      for (const hit of cross.hitBombs) {
        const j = bombs.indexOf(hit);
        if (j !== -1 && t < (times[j] ?? SAFE)) {
          times[j] = t;
          changed = true;
        }
      }
    });
  }

  const { cols } = world.grid;
  const flameTicks = world.rules.explosionTicks;
  crosses.forEach((cross, i) => {
    const t = times[i] ?? SAFE;
    for (const tile of cross.tiles) mark(danger, tile.y * cols + tile.x, t, t + flameTicks);
  });
}

/** Junta o intervalo ao do tile (menor início, maior fim): conservador. */
function mark(danger: DangerMap, i: number, from: number, to: number): void {
  if (from < (danger.start[i] ?? SAFE)) danger.start[i] = from;
  if (to > (danger.end[i] ?? 0)) danger.end[i] = to;
}
