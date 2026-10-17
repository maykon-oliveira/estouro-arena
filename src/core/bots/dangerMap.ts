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

export interface DangerOptions {
  /** Bomba hipotética (a que o bot pensa em soltar), considerada sem alterar o mundo. */
  extra?: Bomb;
  /** Quem olha: as próprias remotas não têm tempo; as alheias são perigo imediato e sem fim. */
  viewerId?: number;
  /** Trata as próprias remotas como explodindo agora (o bot vai apertar o `action`). */
  detonateOwn?: boolean;
}

/**
 * Preenche o mapa de perigo do mundo. Cadeias: uma bomba atingida por outra herda o menor tempo
 * (e o "sem fim" das remotas alheias).
 */
export function computeDanger(
  world: World,
  danger: DangerMap,
  { extra, viewerId, detonateOwn = false }: DangerOptions = {},
): void {
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
  const times = bombs.map((b) => {
    if (!b.remote) return Math.max(0, b.fuse);
    if (b.ownerId !== viewerId) return 0;
    return detonateOwn ? 0 : SAFE;
  });
  // Remota alheia pode explodir a qualquer momento: o perigo não acaba.
  const open = bombs.map((b) => b.remote === true && b.ownerId !== viewerId);

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
          open[j] = open[i] ?? false;
          changed = true;
        }
      }
    });
  }

  const { cols } = world.grid;
  const flameTicks = world.rules.explosionTicks;
  crosses.forEach((cross, i) => {
    const t = times[i] ?? SAFE;
    if (t === SAFE) return;
    const until = open[i] ? SAFE : t + flameTicks;
    for (const tile of cross.tiles) mark(danger, tile.y * cols + tile.x, t, until);
  });
}

/** Junta o intervalo ao do tile (menor início, maior fim): conservador. */
function mark(danger: DangerMap, i: number, from: number, to: number): void {
  if (from < (danger.start[i] ?? SAFE)) danger.start[i] = from;
  if (to > (danger.end[i] ?? 0)) danger.end[i] = to;
}
