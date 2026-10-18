import { bombAt } from '../bombs';
import { ABILITY_PASS_BLOCKS, playerSpeed } from '../items';
import { DIRECTION_VECTORS, type Direction } from '../direction';
import { terrainSpeed, terrainWalkable, type TerrainMods } from '../mounts';
import { BLOCK } from '../terrainIds';
import type { Player, World } from '../world';
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

/** Quem anda pela rota: posição contínua, velocidade (tiles/s) e se atravessa blocos. */
export interface Mover extends TerrainMods {
  x: number;
  y: number;
  speed: number;
  passBlocks: boolean;
  /** Deslizando no gelo: o primeiro passo só pode seguir nessa direção. */
  slide?: Direction | null;
  /** Montaria (id; muda terrenos: capivara nada na água). */
  mount?: string | null;
  /** Personagem (id; a passiva pode mudar terrenos: Iara na água rasa). */
  character?: string | null;
}

export function moverOf(world: World, player: Player): Mover {
  return {
    x: player.x,
    y: player.y,
    speed: playerSpeed(world, player),
    passBlocks: player.abilities.has(ABILITY_PASS_BLOCKS),
    slide: player.iceSlide,
    mount: player.mount,
    character: player.character,
  };
}

/**
 * Ticks para atravessar um tile, pela velocidade e o terreno do tile. Dentro de bloco (com
 * `atravessa_bloco`) custa o dobro, para o bot não passear por dentro dos blocos à toa.
 */
export function ticksPerTile(world: World, i: number, mover: Mover): number {
  const id = world.grid.tiles[i];
  const multiplier = id === undefined ? 1 : terrainSpeed(world, mover, id);
  const speed = mover.speed * multiplier;
  if (speed <= 0) return UNREACHABLE;
  const ticks = Math.ceil(world.rules.tickRate / speed);
  return id === BLOCK ? ticks * 2 : ticks;
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
  from: Mover,
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
  const perTick = 1 / ticksPerTile(world, origin, from);
  // Deslizando no gelo, não dá para virar agora: só segue na direção do deslize (se puder).
  const slide = from.slide ? DIRECTION_VECTORS[from.slide] : null;
  const firstSteps =
    slide && isEnterable(world, from, ox + slide.dx, oy + slide.dy)
      ? [[slide.dx, slide.dy] as const]
      : NEIGHBORS;
  for (const [dx, dy] of firstSteps) {
    const along = dx !== 0 ? (from.x - ox) * dx : (from.y - oy) * dy;
    const cross = dx !== 0 ? Math.abs(from.y - oy) : Math.abs(from.x - ox);
    const entry = Math.max(0, Math.ceil((0.5 - along + cross) / perTick - 1e-9));
    relax(world, danger, search, from, origin, ox + dx, oy + dy, entry, margin);
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

    const leave = best + ticksPerTile(world, u, from);
    const ux = u % grid.cols;
    const uy = Math.floor(u / grid.cols);

    // Gelo: quem entrou desliza reto; só vira se o tile à frente não for enterável.
    const p = prev[u] ?? -1;
    if (p !== -1 && isSlipperyTile(world, u)) {
      const dx = ux - (p % grid.cols);
      const dy = uy - Math.floor(p / grid.cols);
      if (isEnterable(world, from, ux + dx, uy + dy)) {
        relax(world, danger, search, from, u, ux + dx, uy + dy, leave, margin);
        continue;
      }
    }
    for (const [dx, dy] of NEIGHBORS)
      relax(world, danger, search, from, u, ux + dx, uy + dy, leave, margin);
  }
}

/** Tenta chegar ao tile (x, y) vindo de `from` no tick `at`. */
function relax(
  world: World,
  danger: DangerMap,
  search: PathSearch,
  mover: Mover,
  from: number,
  x: number,
  y: number,
  at: number,
  margin: number,
): void {
  const { grid } = world;
  if (x < 0 || y < 0 || x >= grid.cols || y >= grid.rows) return;
  const v = y * grid.cols + x;
  if (search.done[v] || at >= (search.time[v] ?? UNREACHABLE)) return;
  if (!isEnterable(world, mover, x, y)) return;
  if (!canOccupy(danger, v, at, at + ticksPerTile(world, v, mover), margin)) return;
  search.time[v] = at;
  search.prev[v] = from;
}

/** O tile está na grade, é andável para quem anda (atravessa blocos?) e não tem bomba. */
function isEnterable(world: World, mover: Mover, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= world.grid.cols || y >= world.grid.rows) return false;
  const id = world.grid.tiles[y * world.grid.cols + x];
  if (id === undefined || bombAt(world, x, y)) return false;
  return terrainWalkable(world, mover, id) || (mover.passBlocks && id === BLOCK);
}

/** Gelo (ou outro terreno escorregadio). */
export function isSlipperyTile(world: World, i: number): boolean {
  const id = world.grid.tiles[i];
  return id !== undefined && world.terrains.get(id)?.slippery === true;
}

/** Rota até `goal` (do primeiro passo ao destino, sem a origem) em `out`; vazia se for a origem. */
export function pathTo(search: PathSearch, goal: number, out: number[]): void {
  out.length = 0;
  if ((search.time[goal] ?? UNREACHABLE) === UNREACHABLE) return;
  for (let i = goal; (search.prev[i] ?? -1) !== -1; i = search.prev[i] ?? -1) out.push(i);
  out.reverse();
}
