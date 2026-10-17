import type { GameEvent } from '../events';
import { DIRECTION_VECTORS, type Direction } from './direction';
import { inBounds, setTile, tileAt, type Point } from './grid';
import { FLOOR } from './terrainIds';
import type { Bomb, Player, World } from './world';

const CROSS: readonly Direction[] = ['up', 'down', 'left', 'right'];

export function bombAt(world: World, x: number, y: number): Bomb | undefined {
  return world.bombs.find((b) => b.x === x && b.y === y);
}

/** Solta uma bomba no tile do jogador, se ele tiver bomba livre e o terreno permitir. */
export function placeBomb(world: World, player: Player, out: GameEvent[]): void {
  const x = Math.round(player.x);
  const y = Math.round(player.y);
  const terrainId = tileAt(world.grid, x, y);
  const terrain = terrainId === undefined ? undefined : world.terrains.get(terrainId);
  if (!terrain?.allowsBomb || bombAt(world, x, y)) return;

  const active = world.bombs.filter((b) => b.ownerId === player.id).length;
  if (active >= player.maxBombs) return;

  const bomb: Bomb = {
    id: world.nextBombId++,
    ownerId: player.id,
    x,
    y,
    fuse: world.rules.fuseTicks,
    range: player.range,
  };
  world.bombs.push(bomb);
  out.push({ type: 'bomba.colocada', bombId: bomb.id, playerId: player.id, x, y });
}

/**
 * Um tick de bombas: apaga chamas vencidas (blocos queimados viram chão), queima pavios
 * e detona bombas com pavio zerado ou atingidas por chama — em cadeia, no mesmo tick.
 */
export function updateBombs(world: World, out: GameEvent[]): void {
  const { grid, flames } = world;

  for (let i = 0; i < flames.length; i++) {
    const left = flames[i] ?? 0;
    if (left === 0) continue;
    flames[i] = left - 1;
    if (left === 1) {
      const id = grid.tiles[i];
      if (id !== undefined && world.terrains.get(id)?.destructible) {
        const x = i % grid.cols;
        const y = Math.floor(i / grid.cols);
        setTile(grid, x, y, FLOOR);
        out.push({ type: 'bloco.destruido', x, y });
      }
    }
  }

  for (const bomb of world.bombs) bomb.fuse--;

  const queue = world.bombs.filter((b) => b.fuse <= 0 || (flames[b.y * grid.cols + b.x] ?? 0) > 0);
  while (queue.length > 0) {
    const bomb = queue.shift();
    if (!bomb || !world.bombs.includes(bomb)) continue;
    explode(world, bomb, queue, out);
  }
}

function explode(world: World, bomb: Bomb, queue: Bomb[], out: GameEvent[]): void {
  world.bombs.splice(world.bombs.indexOf(bomb), 1);

  const tiles: Point[] = [{ x: bomb.x, y: bomb.y }];
  for (const dir of CROSS) {
    const { dx, dy } = DIRECTION_VECTORS[dir];
    for (let d = 1; d <= bomb.range; d++) {
      const x = bomb.x + dx * d;
      const y = bomb.y + dy * d;
      if (!inBounds(world.grid, x, y)) break;

      const hitBomb = bombAt(world, x, y);
      if (hitBomb) {
        // O fogo para na bomba, que explode em cadeia.
        tiles.push({ x, y });
        queue.push(hitBomb);
        break;
      }

      const id = tileAt(world.grid, x, y);
      const terrain = id === undefined ? undefined : world.terrains.get(id);
      if (terrain?.blocksFire) {
        // Bloco quebrável pega fogo (vira chão quando a chama apagar); parede só barra.
        if (terrain.destructible) tiles.push({ x, y });
        break;
      }
      tiles.push({ x, y });
    }
  }

  for (const t of tiles) {
    const i = t.y * world.grid.cols + t.x;
    world.flames[i] = Math.max(world.flames[i] ?? 0, world.rules.explosionTicks);
  }
  out.push({ type: 'bomba.explodiu', bombId: bomb.id, x: bomb.x, y: bomb.y, tiles });
}
