import { bombAt } from '../bombs';
import type { Point } from '../grid';
import type { World } from '../world';
import { SAFE, type DangerMap } from './dangerMap';

/** Tempo de um tile não alcançado. */
export const UNREACHABLE = SAFE;

/** Arrays reaproveitados entre buscas (sem alocar a cada decisão). */
export interface PathSearch {
  /** Tick de chegada a cada tile (UNREACHABLE = não alcançado). */
  time: Int32Array;
  /** Tile anterior na melhor rota (-1 = origem ou não alcançado). */
  prev: Int32Array;
  done: Uint8Array;
}

export function createPathSearch(size: number): PathSearch {
  return { time: new Int32Array(size), prev: new Int32Array(size), done: new Uint8Array(size) };
}

/** Vizinhos na ordem fixa cima, direita, baixo, esquerda (desempate determinístico). */
const NEIGHBORS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;

/** Ticks para atravessar um tile, pela velocidade do jogador e o terreno do tile. */
export function ticksPerTile(world: World, i: number): number {
  const id = world.grid.tiles[i];
  const multiplier = (id === undefined ? undefined : world.terrains.get(id)?.speedMultiplier) ?? 1;
  const speed = world.rules.playerSpeed * multiplier;
  return speed > 0 ? Math.ceil(world.rules.tickRate / speed) : UNREACHABLE;
}

/** O bot pode ficar no tile `i` de `from` até `to` sem cruzar o perigo (alargado por `margin`)? */
export function canOccupy(
  danger: DangerMap,
  i: number,
  from: number,
  to: number,
  margin: number,
): boolean {
  const start = danger.start[i] ?? SAFE;
  if (start === SAFE) return true;
  const end = danger.end[i] ?? 0;
  return to <= start - margin || from >= end + margin;
}

/**
 * Dijkstra a partir da posição contínua `from`, com custo em ticks. O tempo de um tile é o
 * instante em que o centro do bot cruza a borda dele (é aí que o tile arredondado muda — e é o
 * tile arredondado que a chama mata). Só entra em tile andável, sem bomba, e onde o tempo de
 * permanência não cruza o perigo. O tile de partida sempre expande (mesmo condenado, o bot
 * precisa tentar sair).
 */
export function searchPaths(
  world: World,
  danger: DangerMap,
  from: Point,
  margin: number,
  search: PathSearch,
): void {
  const { grid } = world;
  const { time, prev, done } = search;
  time.fill(UNREACHABLE);
  prev.fill(-1);
  done.fill(0);

  const ox = Math.round(from.x);
  const oy = Math.round(from.y);
  const origin = oy * grid.cols + ox;
  if (origin < 0 || origin >= grid.tiles.length) return;
  time[origin] = 0;
  done[origin] = 1;

  // Primeiro passo pela posição real: o bot pode já estar perto da borda (ou fora do eixo).
  const perTick = 1 / ticksPerTile(world, origin);
  for (const [dx, dy] of NEIGHBORS) {
    const along = dx !== 0 ? (from.x - ox) * dx : (from.y - oy) * dy;
    const cross = dx !== 0 ? Math.abs(from.y - oy) : Math.abs(from.x - ox);
    const entry = Math.max(0, Math.ceil((0.5 - along + cross) / perTick - 1e-9));
    relax(world, danger, search, origin, ox + dx, oy + dy, entry, margin);
  }

  for (;;) {
    // Grade pequena (≤ algumas centenas de tiles): seleção linear do menor tempo basta.
    let u = -1;
    let best = UNREACHABLE;
    for (let i = 0; i < time.length; i++) {
      const t = time[i] ?? UNREACHABLE;
      if (!done[i] && t < best) {
        best = t;
        u = i;
      }
    }
    if (u === -1) break;
    done[u] = 1;

    const leave = best + ticksPerTile(world, u);
    const ux = u % grid.cols;
    const uy = Math.floor(u / grid.cols);
    for (const [dx, dy] of NEIGHBORS)
      relax(world, danger, search, u, ux + dx, uy + dy, leave, margin);
  }
}

/** Tenta chegar ao tile (x, y) vindo de `from` no tick `at`. */
function relax(
  world: World,
  danger: DangerMap,
  search: PathSearch,
  from: number,
  x: number,
  y: number,
  at: number,
  margin: number,
): void {
  const { grid, terrains } = world;
  if (x < 0 || y < 0 || x >= grid.cols || y >= grid.rows) return;
  const v = y * grid.cols + x;
  if (search.done[v] || at >= (search.time[v] ?? UNREACHABLE)) return;
  const id = grid.tiles[v];
  if (id === undefined || terrains.get(id)?.walkable !== true || bombAt(world, x, y)) return;
  if (!canOccupy(danger, v, at, at + ticksPerTile(world, v), margin)) return;
  search.time[v] = at;
  search.prev[v] = from;
}

/** Rota até `goal` (do primeiro passo ao destino, sem a origem) em `out`; vazia se for a origem. */
export function pathTo(search: PathSearch, goal: number, out: number[]): void {
  out.length = 0;
  if ((search.time[goal] ?? UNREACHABLE) === UNREACHABLE) return;
  for (let i = goal; (search.prev[i] ?? -1) !== -1; i = search.prev[i] ?? -1) out.push(i);
  out.reverse();
}
