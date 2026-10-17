import type { GameEvent } from '../events';
import type { Grid } from './grid';
import { WALL } from './terrainIds';
import type { World } from './world';

/** Queda dos tiles na morte súbita (gravada no mundo quando começa). */
export interface Collapse {
  /** Índices dos tiles na ordem em que caem. */
  order: number[];
  /** Próximo índice de `order` a cair. */
  next: number;
  /** Tick (do mundo) em que cada tile cai, por índice de tile; SAFE = não cai. */
  dropAt: Int32Array;
}

/** "Nunca" para `dropAt` (mesmo valor de SAFE dos bots). */
const NEVER = 0x7fffffff;

/**
 * Espiral no sentido horário, do anel jogável mais externo (dentro da borda) para o centro,
 * começando no canto superior esquerdo. Tiles que já são parede ficam de fora.
 */
export function spiralOrder(grid: Grid): number[] {
  const order: number[] = [];
  let top = 1;
  let left = 1;
  let bottom = grid.rows - 2;
  let right = grid.cols - 2;
  const push = (x: number, y: number) => {
    const i = y * grid.cols + x;
    if (grid.tiles[i] !== WALL) order.push(i);
  };
  while (top <= bottom && left <= right) {
    for (let x = left; x <= right; x++) push(x, top);
    for (let y = top + 1; y <= bottom; y++) push(right, y);
    if (top < bottom) for (let x = right - 1; x >= left; x--) push(x, bottom);
    if (left < right) for (let y = bottom - 1; y > top; y--) push(left, y);
    top++;
    left++;
    bottom--;
    right--;
  }
  return order;
}

/**
 * Começa a queda: o tile k (de n) cai `round((k + 1) × duração ÷ n)` ticks depois de agora,
 * então o último cai exatamente quando a duração acaba.
 */
export function startCollapse(world: World, durationTicks: number): void {
  const order = spiralOrder(world.grid);
  const dropAt = new Int32Array(world.grid.tiles.length).fill(NEVER);
  order.forEach((tile, k) => {
    dropAt[tile] = world.tick + Math.round(((k + 1) * durationTicks) / order.length);
  });
  world.collapse = { order, next: 0, dropAt };
}

/** Derruba os tiles cuja hora chegou (chamado depois de cada tick do mundo). */
export function advanceCollapse(world: World, out: GameEvent[]): void {
  const collapse = world.collapse;
  if (!collapse) return;
  while (collapse.next < collapse.order.length) {
    const tile = collapse.order[collapse.next] ?? -1;
    if ((collapse.dropAt[tile] ?? NEVER) > world.tick) break;
    collapse.next++;
    crushTile(world, tile, out);
  }
}

/**
 * O tile vira parede: esmaga quem está nele (escudo e invulnerabilidade não salvam), apaga a
 * bomba (sem explodir), o item e a chama. Quem está pulando para ele também morre.
 */
function crushTile(world: World, i: number, out: GameEvent[]): void {
  const { cols } = world.grid;
  const x = i % cols;
  const y = Math.floor(i / cols);
  world.grid.tiles[i] = WALL;
  world.flames[i] = 0;
  world.items[i] = null;
  world.hiddenItems[i] = null;
  world.bombs = world.bombs.filter((b) => b.x !== x || b.y !== y);
  out.push({ type: 'morte_subita.bloco_caiu', x, y });

  for (const p of world.players) {
    if (!p.alive) continue;
    const here = p.jump ? p.jump.toX === x && p.jump.toY === y : false;
    const onTile = !p.jump && Math.round(p.x) === x && Math.round(p.y) === y;
    if (!here && !onTile) continue;
    p.alive = false;
    p.moveDir = null;
    p.jump = null;
    out.push({ type: 'jogador.morreu', playerId: p.id, cause: 'esmagado' });
  }
}
