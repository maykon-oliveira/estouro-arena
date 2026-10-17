import { bombAt } from './bombs';
import { DIRECTION_VECTORS } from './direction';
import { tileAt } from './grid';
import type { Player, World } from './world';

/** Tolerância para considerar o jogador alinhado (absorve erro de ponto flutuante). */
const EPSILON = 1e-6;

function isWalkable(world: World, x: number, y: number): boolean {
  const id = tileAt(world.grid, x, y);
  return id !== undefined && world.terrains.get(id)?.walkable === true;
}

/**
 * Move o jogador um tick na direção segurada.
 * Anda só em eixo: para virar, primeiro desliza até a linha/coluna (assistência de curva).
 */
export function movePlayer(world: World, player: Player): void {
  const dir = player.moveDir;
  if (dir === null) return;
  player.facing = dir;

  const { dx, dy } = DIRECTION_VECTORS[dir];
  const horizontal = dx !== 0;
  const sign = horizontal ? dx : dy;

  // Trabalha em eixo "principal" (o do movimento) e "cruzado", para tratar as 4 direções iguais.
  let main = horizontal ? player.x : player.y;
  let cross = horizontal ? player.y : player.x;
  const walkable = (m: number, c: number): boolean =>
    horizontal ? isWalkable(world, m, c) : isWalkable(world, c, m);
  // Bomba só barra quem tenta entrar no tile; quem está em cima dela consegue sair.
  const canEnter = (m: number, c: number): boolean =>
    walkable(m, c) && !(horizontal ? bombAt(world, m, c) : bombAt(world, c, m));

  const here = tileAt(world.grid, Math.round(player.x), Math.round(player.y));
  const speedMultiplier =
    (here === undefined ? undefined : world.terrains.get(here)?.speedMultiplier) ?? 1;
  let budget = (world.rules.playerSpeed * speedMultiplier) / world.rules.tickRate;

  const mainTile = Math.round(main);

  // Assistência de curva: fora do eixo, desliza para a faixa vizinha livre mais próxima.
  if (Math.abs(cross - Math.round(cross)) > EPSILON) {
    const lane = [Math.floor(cross), Math.ceil(cross)]
      .filter((l) => Math.abs(cross - l) <= world.rules.cornerAssistTiles + EPSILON)
      .filter((l) => walkable(mainTile, l) && canEnter(mainTile + sign, l))
      .sort((a, b) => Math.abs(cross - a) - Math.abs(cross - b))[0];
    if (lane === undefined) return;

    const distance = Math.abs(lane - cross);
    const slide = Math.min(budget, distance);
    cross += Math.sign(lane - cross) * slide;
    budget -= slide;
    if (Math.abs(lane - cross) <= EPSILON) cross = lane;
    else budget = 0;
  } else {
    cross = Math.round(cross);
  }

  if (budget > 0) {
    if (canEnter(mainTile + sign, cross)) {
      main += sign * budget;
    } else if (sign * (mainTile - main) > 0) {
      // Próximo tile bloqueado: só avança até o centro do tile atual.
      main += sign * Math.min(budget, Math.abs(mainTile - main));
    }
  }

  if (horizontal) {
    player.x = main;
    player.y = cross;
  } else {
    player.y = main;
    player.x = cross;
  }
}
