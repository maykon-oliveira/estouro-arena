import type { GameEvent } from '../events';
import { bombAt } from './bombs';
import { DIRECTION_VECTORS } from './direction';
import { tileAt } from './grid';
import { ABILITY_KICK } from './items';
import type { Bomb, World } from './world';

/** Tolerância para "parado no centro do tile" (erro de ponto flutuante). */
const EPSILON = 1e-6;

/** A bomba pode entrar no tile (x, y)? Não entra em tile não andável, com bomba ou com jogador vivo. */
export function canSlideInto(world: World, x: number, y: number): boolean {
  const id = tileAt(world.grid, x, y);
  if (id === undefined || world.terrains.get(id)?.walkable !== true) return false;
  if (bombAt(world, x, y)) return false;
  return !world.players.some((p) => p.alive && Math.round(p.x) === x && Math.round(p.y) === y);
}

/**
 * Chutes do tick (depois do movimento): jogador com chute, parado no centro do tile e segurando
 * uma direção, chuta a bomba parada do tile à frente — se ela tiver para onde ir.
 */
export function kickBombs(world: World, out: GameEvent[]): void {
  for (const player of world.players) {
    const dir = player.moveDir;
    if (!player.alive || dir === null || !player.abilities.has(ABILITY_KICK)) continue;
    const tx = Math.round(player.x);
    const ty = Math.round(player.y);
    if (Math.abs(player.x - tx) > EPSILON || Math.abs(player.y - ty) > EPSILON) continue;

    const { dx, dy } = DIRECTION_VECTORS[dir];
    const bomb = bombAt(world, tx + dx, ty + dy);
    if (!bomb || bomb.slide || !canSlideInto(world, bomb.x + dx, bomb.y + dy)) continue;
    bomb.slide = dir;
    bomb.slideProgress = 0;
    out.push({ type: 'bomba.chutada', bombId: bomb.id, playerId: player.id, dir });
  }
}

/**
 * Bombas chutadas avançam. A meio caminho (0,5) passam a pertencer ao tile seguinte; ao cruzar o
 * centro de um tile com o seguinte bloqueado, param ali (`bomba.parou`).
 */
export function slideBombs(world: World, out: GameEvent[]): void {
  const stepTiles = world.rules.kickSpeed / world.rules.tickRate;
  for (const bomb of world.bombs) {
    if (!bomb.slide) continue;
    const { dx, dy } = DIRECTION_VECTORS[bomb.slide];
    const before = bomb.slideProgress ?? 0;
    const progress = before + stepTiles;
    const nextFree = canSlideInto(world, bomb.x + dx, bomb.y + dy);

    if (before < 0 && progress >= 0 && !nextFree) {
      stop(bomb, out);
    } else if (progress >= 0.5) {
      if (nextFree) {
        bomb.x += dx;
        bomb.y += dy;
        bomb.slideProgress = progress - 1;
      } else {
        stop(bomb, out);
      }
    } else {
      bomb.slideProgress = progress;
    }
  }
}

function stop(bomb: Bomb, out: GameEvent[]): void {
  bomb.slide = null;
  bomb.slideProgress = 0;
  out.push({ type: 'bomba.parou', bombId: bomb.id, x: bomb.x, y: bomb.y });
}
