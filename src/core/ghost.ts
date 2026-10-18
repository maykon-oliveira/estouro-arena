import type { GameEvent } from '../events';
import { bombAt } from './bombs';
import type { Direction } from './direction';
import type { Grid } from './grid';
import type { Player, World } from './world';

/** Bomba arremessada em voo, do tile do anel até o pouso. */
export interface Flight {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** Direção para dentro (para achar outro pouso se o escolhido ficou ocupado). */
  dx: number;
  dy: number;
  ticksLeft: number;
  totalTicks: number;
}

/** Fantasma vingador: anda no anel da borda e arremessa 1 bomba por rodada. */
export interface Ghost {
  /** Posição no perímetro, no sentido horário a partir do canto superior esquerdo. */
  s: number;
  moveDir: Direction | null;
  /** Direção e sentido do último movimento (para seguir dobrando as quinas). */
  travelDir: Direction | null;
  travelSign: number;
  /** Já arremessou nesta rodada. */
  thrown: boolean;
  flight: Flight | null;
}

const EPSILON = 1e-6;

type Side = 'top' | 'right' | 'bottom' | 'left';

/** Sentido no perímetro (+1 horário, −1 anti-horário, 0 não anda) por lado e direção. */
const SIGNS: Readonly<Record<Side, Partial<Record<Direction, number>>>> = {
  top: { right: 1, left: -1 },
  right: { down: 1, up: -1 },
  bottom: { left: 1, right: -1 },
  left: { up: 1, down: -1 },
};

function lengths(grid: Grid): { w: number; h: number; perimeter: number } {
  const w = grid.cols - 1;
  const h = grid.rows - 1;
  return { w, h, perimeter: 2 * (w + h) };
}

function wrap(grid: Grid, s: number): number {
  const { perimeter } = lengths(grid);
  return ((s % perimeter) + perimeter) % perimeter;
}

/** Lado do perímetro em `s` e onde esse lado começa. */
function sideAt(grid: Grid, s: number): { side: Side; start: number } {
  const { w, h } = lengths(grid);
  const p = wrap(grid, s);
  if (p < w) return { side: 'top', start: 0 };
  if (p < w + h) return { side: 'right', start: w };
  if (p < 2 * w + h) return { side: 'bottom', start: w + h };
  return { side: 'left', start: 2 * w + h };
}

/** Ponto (contínuo) do anel na posição `s` do perímetro. */
export function ringPoint(grid: Grid, s: number): { x: number; y: number } {
  const { w, h } = lengths(grid);
  const p = wrap(grid, s);
  const { side, start } = sideAt(grid, p);
  const d = p - start;
  if (side === 'top') return { x: d, y: 0 };
  if (side === 'right') return { x: w, y: d };
  if (side === 'bottom') return { x: w - d, y: h };
  return { x: 0, y: h - d };
}

/** Posição no perímetro do tile (x, y) do anel. */
export function ringPosition(grid: Grid, x: number, y: number): number {
  const { w, h } = lengths(grid);
  if (y === 0) return x;
  if (x === w) return w + y;
  if (y === h) return w + h + (w - x);
  return 2 * w + h + (h - y);
}

/** Tile do anel mais perto de (x, y) (desempate: cima, direita, baixo, esquerda). */
function nearestRingTile(grid: Grid, x: number, y: number): { x: number; y: number } {
  const { w, h } = lengths(grid);
  const cx = Math.min(w, Math.max(0, Math.round(x)));
  const cy = Math.min(h, Math.max(0, Math.round(y)));
  const options = [
    { x: cx, y: 0, d: y },
    { x: w, y: cy, d: w - x },
    { x: cx, y: h, d: h - y },
    { x: 0, y: cy, d: x },
  ];
  let best = options[0] ?? { x: 0, y: 0, d: 0 };
  for (const o of options) if (o.d < best.d - EPSILON) best = o;
  return best;
}

/** Quem morreu há `ghostDelayTicks` vira fantasma no anel, perto de onde morreu. */
export function spawnGhosts(world: World, out: GameEvent[]): void {
  for (const p of world.players) {
    if (p.alive || p.ghost || p.deathTick === null) continue;
    if (world.tick - p.deathTick < world.rules.ghostDelayTicks) continue;
    const tile = nearestRingTile(world.grid, p.x, p.y);
    p.ghost = {
      s: ringPosition(world.grid, tile.x, tile.y),
      moveDir: null,
      travelDir: null,
      travelSign: 0,
      thrown: false,
      flight: null,
    };
    out.push({ type: 'fantasma.surgiu', playerId: p.id, x: tile.x, y: tile.y });
  }
}

/** Comandos de um jogador morto que já é fantasma. */
export function ghostCommand(
  world: World,
  player: Player,
  type: 'move' | 'bomb',
  dir: Direction | null,
  out: GameEvent[],
): void {
  const ghost = player.ghost;
  if (!ghost) return;
  if (type === 'move') ghost.moveDir = dir;
  else throwBomb(world, player, ghost, out);
}

/** Tile do anel em que o fantasma está e a direção "para dentro" (null na quina). */
export function throwOrigin(
  grid: Grid,
  ghost: Ghost,
): { x: number; y: number; dx: number; dy: number } | null {
  const { x, y } = ringPoint(grid, Math.round(ghost.s));
  const { w, h } = lengths(grid);
  const corner = (x === 0 || x === w) && (y === 0 || y === h);
  if (corner) return null;
  if (y === 0) return { x, y, dx: 0, dy: 1 };
  if (y === h) return { x, y, dx: 0, dy: -1 };
  if (x === 0) return { x, y, dx: 1, dy: 0 };
  return { x, y, dx: -1, dy: 0 };
}

/** Primeiro tile, a partir de `from` passos, que aceita bomba e não tem bomba; null se nenhum. */
export function findLanding(
  world: World,
  x: number,
  y: number,
  dx: number,
  dy: number,
  from: number,
): { x: number; y: number } | null {
  const { cols, rows } = world.grid;
  for (let d = from; ; d++) {
    const tx = x + dx * d;
    const ty = y + dy * d;
    // Para antes da borda oposta.
    if (tx <= 0 || ty <= 0 || tx >= cols - 1 || ty >= rows - 1) return null;
    const id = world.grid.tiles[ty * cols + tx];
    const terrain = id === undefined ? undefined : world.terrains.get(id);
    if (terrain?.walkable && terrain.allowsBomb && !bombAt(world, tx, ty)) return { x: tx, y: ty };
  }
}

/** Onde o arremesso do fantasma pousaria agora (null: quina ou sem pouso válido). */
export function throwTarget(world: World, ghost: Ghost): { x: number; y: number } | null {
  const origin = throwOrigin(world.grid, ghost);
  if (!origin) return null;
  return findLanding(world, origin.x, origin.y, origin.dx, origin.dy, world.rules.ghostThrowTiles);
}

function throwBomb(world: World, player: Player, ghost: Ghost, out: GameEvent[]): void {
  if (ghost.thrown || ghost.flight) return;
  const origin = throwOrigin(world.grid, ghost);
  const target = throwTarget(world, ghost);
  if (!origin || !target) return;
  ghost.thrown = true;
  ghost.flight = {
    fromX: origin.x,
    fromY: origin.y,
    toX: target.x,
    toY: target.y,
    dx: origin.dx,
    dy: origin.dy,
    ticksLeft: world.rules.ghostFlightTicks,
    totalTicks: world.rules.ghostFlightTicks,
  };
  out.push({
    type: 'fantasma.arremessou',
    playerId: player.id,
    from: { x: origin.x, y: origin.y },
    to: { x: target.x, y: target.y },
  });
}

/** Um tick dos fantasmas: andam no anel e as bombas em voo pousam. */
export function updateGhosts(world: World, out: GameEvent[]): void {
  spawnGhosts(world, out);
  const step = world.rules.ghostSpeed / world.rules.tickRate;
  for (const p of world.players) {
    const ghost = p.ghost;
    if (!ghost) continue;
    moveGhost(world.grid, ghost, step);
    const flight = ghost.flight;
    if (flight && --flight.ticksLeft <= 0) {
      ghost.flight = null;
      land(world, p, flight, out);
    }
  }
}

function moveGhost(grid: Grid, ghost: Ghost, step: number): void {
  const dir = ghost.moveDir;
  if (dir === null) return;
  const { side, start } = sideAt(grid, ghost.s);
  let sign = SIGNS[side][dir] ?? 0;
  // Na quina exata, vale também o lado anterior.
  if (sign === 0 && Math.abs(wrap(grid, ghost.s) - start) < EPSILON) {
    sign = SIGNS[sideAt(grid, ghost.s - 0.5).side][dir] ?? 0;
  }
  // Segurando a mesma direção depois de dobrar a quina, continua no mesmo sentido.
  if (sign === 0 && dir === ghost.travelDir) sign = ghost.travelSign;
  if (sign === 0) return;
  ghost.travelDir = dir;
  ghost.travelSign = sign;
  ghost.s = wrap(grid, ghost.s + sign * step);
}

/** Pouso: se o tile ficou ocupado, procura o próximo válido para dentro; sem nenhum, se perde. */
function land(world: World, player: Player, flight: Flight, out: GameEvent[]): void {
  const spot = findLanding(world, flight.toX, flight.toY, flight.dx, flight.dy, 0);
  if (!spot) return;
  const bomb = {
    id: world.nextBombId++,
    ownerId: player.id,
    x: spot.x,
    y: spot.y,
    fuse: world.rules.fuseTicks,
    range: world.rules.startRange,
  };
  world.bombs.push(bomb);
  out.push({ type: 'bomba.colocada', bombId: bomb.id, playerId: player.id, x: spot.x, y: spot.y });
}
