import type { GameEvent } from '../events';
import { DIRECTION_VECTORS, type Direction } from './direction';
import { inBounds, setTile, tileAt, type Point } from './grid';
import { ABILITY_PIERCE, ABILITY_REMOTE } from './items';
import { slideBombs } from './kick';
import { FLOOR } from './terrainIds';
import type { Bomb, Player, World } from './world';
import { addEnergy } from './specials';

const CROSS: readonly Direction[] = ['up', 'down', 'left', 'right'];

export function bombAt(world: World, x: number, y: number): Bomb | undefined {
  return findBomb(world.bombs, x, y);
}

function findBomb(bombs: readonly Bomb[], x: number, y: number): Bomb | undefined {
  return bombs.find((b) => b.x === x && b.y === y);
}

/** Solta uma bomba no tile do jogador, se ele tiver bomba livre e o terreno permitir. */
export function placeBomb(world: World, player: Player, out: GameEvent[]): void {
  if (player.jump || player.dash) return; // no ar ou em disparada não solta bomba
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
    pierce: player.abilities.has(ABILITY_PIERCE),
    remote: player.abilities.has(ABILITY_REMOTE),
  };
  world.bombs.push(bomb);
  out.push({ type: 'bomba.colocada', bombId: bomb.id, playerId: player.id, x, y });
}

/** Comando `remote`: a remota mais antiga (menor id) do jogador explode neste tick. */
export function detonateOldestRemote(world: World, player: Player): boolean {
  let oldest: Bomb | undefined;
  for (const bomb of world.bombs) {
    if (bomb.remote && bomb.ownerId === player.id && (!oldest || bomb.id < oldest.id)) {
      oldest = bomb;
    }
  }
  if (!oldest) return false;
  oldest.remote = false;
  oldest.fuse = 0;
  return true;
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
      const owner = world.flameOwner[i] ?? -1;
      world.flameOwner[i] = -1;
      world.flameFromTrail[i] = 0;
      const id = grid.tiles[i];
      const terrain = id === undefined ? undefined : world.terrains.get(id);
      if (id !== undefined && terrain?.destructible) {
        const x = i % grid.cols;
        const y = Math.floor(i / grid.cols);
        setTile(grid, x, y, FLOOR);
        // Bloco (barra o fogo) é "destruído" e pode revelar item; o resto (mato) só queima.
        if (!terrain.blocksFire) {
          out.push({ type: 'terreno.queimou', x, y, terrainId: id });
          continue;
        }
        out.push({ type: 'bloco.destruido', x, y });
        const ownerPlayer = world.players[owner];
        if (ownerPlayer) addEnergy(world, ownerPlayer, world.rules.energyPerBlock, out);
        const hidden = world.hiddenItems[i];
        if (hidden !== null && hidden !== undefined) {
          world.hiddenItems[i] = null;
          world.items[i] = hidden;
          out.push({ type: 'item.revelado', itemId: hidden, x, y });
        }
      }
    }
  }

  slideBombs(world, out);

  // Remotas não queimam o pavio (só explodem por comando ou atingidas por fogo).
  for (const bomb of world.bombs) if (!bomb.remote) bomb.fuse--;

  const queue = world.bombs.filter((b) => b.fuse <= 0 || (flames[b.y * grid.cols + b.x] ?? 0) > 0);
  while (queue.length > 0) {
    const bomb = queue.shift();
    if (!bomb || !world.bombs.includes(bomb)) continue;
    explode(world, bomb, queue, out);
  }
}

/**
 * Tiles que a explosão da bomba atingiria agora, e as bombas que ela detonaria.
 * Pura (não altera o mundo): usada pela explosão real, pela prévia do painel de debug e pelo
 * mapa de perigo dos bots, que passa `bombs` com uma bomba hipotética a mais.
 */
export function explosionTiles(
  world: World,
  bomb: Bomb,
  bombs: readonly Bomb[] = world.bombs,
): { tiles: Point[]; hitBombs: Bomb[] } {
  const tiles: Point[] = [{ x: bomb.x, y: bomb.y }];
  const hitBombs: Bomb[] = [];
  for (const dir of CROSS) {
    const { dx, dy } = DIRECTION_VECTORS[dir];
    for (let d = 1; d <= bomb.range; d++) {
      const x = bomb.x + dx * d;
      const y = bomb.y + dy * d;
      if (!inBounds(world.grid, x, y)) break;

      const hitBomb = findBomb(bombs, x, y);
      if (hitBomb) {
        // O fogo para na bomba, que explode em cadeia.
        tiles.push({ x, y });
        hitBombs.push(hitBomb);
        break;
      }

      const id = tileAt(world.grid, x, y);
      const terrain = id === undefined ? undefined : world.terrains.get(id);
      if (terrain?.blocksFire) {
        // Bloco quebrável pega fogo (vira chão quando a chama apagar); parede só barra.
        if (!terrain.destructible) break;
        tiles.push({ x, y });
        // Perfurante: o fogo segue depois do bloco.
        if (bomb.pierce) continue;
        break;
      }
      tiles.push({ x, y });
    }
  }
  return { tiles, hitBombs };
}

function explode(world: World, bomb: Bomb, queue: Bomb[], out: GameEvent[]): void {
  world.bombs.splice(world.bombs.indexOf(bomb), 1);

  const { tiles, hitBombs } = explosionTiles(world, bomb);
  queue.push(...hitBombs);

  for (const t of tiles) {
    const i = t.y * world.grid.cols + t.x;
    world.flames[i] = Math.max(world.flames[i] ?? 0, world.rules.explosionTicks);
    world.flameOwner[i] = bomb.ownerId;
    world.flameFromTrail[i] = 0;
    const itemId = world.items[i];
    if (itemId !== null && itemId !== undefined) {
      world.items[i] = null;
      out.push({ type: 'item.destruido', itemId, x: t.x, y: t.y });
    }
  }
  out.push({ type: 'bomba.explodiu', bombId: bomb.id, x: bomb.x, y: bomb.y, tiles });
}
