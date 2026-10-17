import { bombAt, explosionTiles } from '../bombs';
import type { Command } from '../commands';
import type { Direction } from '../direction';
import { tileAt, type Point } from '../grid';
import { ABILITY_PIERCE, playerSpeed } from '../items';
import type { Match } from '../match';
import { createRng, type Rng } from '../rng';
import type { Bomb, Player, World } from '../world';
import { computeDanger, createDangerMap, SAFE, type DangerMap } from './dangerMap';
import {
  createPathSearch,
  moverOf,
  pathTo,
  searchPaths,
  UNREACHABLE,
  type PathSearch,
} from './paths';

/** Parâmetros de um nível de bot (src/data/bots.json, durações já em ticks). */
export interface BotLevel {
  /** Intervalo entre decisões. */
  reactionTicks: number;
  /** Chance, por bomba, de pular a checagem de fuga. */
  mistakeChance: number;
  /** Chance, por decisão, de tentar caçar antes de abrir caminho. */
  aggression: number;
  /** Distância máxima até um item para ir buscá-lo (itens chegam no passo 3). */
  itemSearchTiles: number;
}

export interface BotConfig {
  level: BotLevel;
  /** Folga, dos dois lados do perigo previsto, que as rotas respeitam. */
  escapeMarginTicks: number;
}

/** Cérebro de um bot: só lê o mundo e gera comandos para o próprio jogador. */
export interface Bot {
  readonly playerId: number;
  readonly config: BotConfig;
  readonly rng: Rng;
  /** Mundo da última atualização; outro mundo (rodada nova) zera o plano. */
  world: World | null;
  nextDecisionTick: number;
  forceDecision: boolean;
  /** Rota atual (índices de tile, do primeiro passo ao destino). */
  path: number[];
  pathStep: number;
  /** Último `move` emitido; `undefined` = desconhecido (força emitir no próximo tick). */
  lastDir: Direction | null | undefined;
  danger: DangerMap;
  dangerWithBomb: DangerMap;
  search: PathSearch;
  searchWithBomb: PathSearch;
}

export function createBot(playerId: number, config: BotConfig, seed: number): Bot {
  return {
    playerId,
    config,
    // Seed própria por bot: não consome o RNG do mundo (que gera as grades).
    rng: createRng((seed ^ Math.imul(playerId + 1, 0x9e3779b1)) >>> 0),
    world: null,
    nextDecisionTick: 0,
    forceDecision: false,
    path: [],
    pathStep: 0,
    lastDir: null,
    danger: createDangerMap(0),
    dangerWithBomb: createDangerMap(0),
    search: createPathSearch(0),
    searchWithBomb: createPathSearch(0),
  };
}

/** Bots só agem com a rodada em jogo (não na contagem nem depois do fim). */
export function runBots(match: Match, bots: readonly Bot[], out: Command[]): void {
  if (match.phase !== 'playing' && match.phase !== 'ending') return;
  for (const bot of bots) updateBot(bot, match.world, out);
}

/** Um tick do bot: decide no ritmo do nível e, a cada tick, segue a rota escolhida. */
export function updateBot(bot: Bot, world: World, out: Command[]): void {
  if (bot.world !== world) resetFor(bot, world);
  const player = world.players[bot.playerId];
  if (!player?.alive) {
    bot.path.length = 0;
    return;
  }

  if (bot.forceDecision || world.tick >= bot.nextDecisionTick) {
    bot.forceDecision = false;
    bot.nextDecisionTick = world.tick + bot.config.level.reactionTicks;
    decide(bot, world, player, out);
  }

  const dir = steer(bot, world, player);
  if (dir !== bot.lastDir) {
    bot.lastDir = dir;
    out.push({ type: 'move', playerId: bot.playerId, dir });
  }
}

function resetFor(bot: Bot, world: World): void {
  bot.world = world;
  bot.path.length = 0;
  bot.pathStep = 0;
  bot.nextDecisionTick = world.tick;
  bot.forceDecision = false;
  // A direção da rodada anterior pode ter ficado "segurada" na partida: força um `move` novo.
  bot.lastDir = undefined;
  const size = world.grid.tiles.length;
  if (bot.danger.start.length !== size) {
    bot.danger = createDangerMap(size);
    bot.dangerWithBomb = createDangerMap(size);
    bot.search = createPathSearch(size);
    bot.searchWithBomb = createPathSearch(size);
  }
}

function decide(bot: Bot, world: World, player: Player, out: Command[]): void {
  const { cols } = world.grid;
  const here: Point = { x: Math.round(player.x), y: Math.round(player.y) };
  const hi = here.y * cols + here.x;
  const margin = bot.config.escapeMarginTicks;

  computeDanger(world, bot.danger);
  searchPaths(world, bot.danger, moverOf(world, player), margin, bot.search);

  // 1. Fugir.
  if ((bot.danger.start[hi] ?? SAFE) !== SAFE) {
    const safe = (i: number): boolean => bot.danger.start[i] === SAFE;
    let goal = currentGoal(bot, (i) => safe(i));
    if (goal === -1) goal = nearest(bot.search, safe);
    if (goal === -1) goal = latestDanger(bot.search, bot.danger);
    follow(bot, bot.search, goal);
    return;
  }

  const hypothetical: Bomb = {
    id: -1,
    ownerId: player.id,
    x: here.x,
    y: here.y,
    fuse: world.rules.fuseTicks,
    range: player.range,
    pierce: player.abilities.has(ABILITY_PIERCE),
  };
  const canBomb = canPlaceBomb(world, player, here);
  const cross = canBomb
    ? explosionTiles(world, hypothetical, [...world.bombs, hypothetical])
    : null;

  // 2. Atacar.
  if (cross && cross.tiles.some((t) => enemyAt(world, player, t))) {
    if (tryBomb(bot, world, player, hypothetical, out)) return;
  }

  // 3/4/5. Item, abrir caminho ou caçar (a agressividade decide se caça primeiro).
  const huntFirst = bot.rng.next() < bot.config.level.aggression;
  if (huntFirst && hunt(bot, world, player, hi)) return;

  const isItemSpot = (i: number): boolean =>
    i !== hi &&
    world.items[i] !== null &&
    bot.danger.start[i] === SAFE &&
    Math.abs((i % cols) - here.x) + Math.abs(Math.floor(i / cols) - here.y) <=
      bot.config.level.itemSearchTiles;
  let itemSpot = currentGoal(bot, isItemSpot);
  if (itemSpot === -1) itemSpot = nearest(bot.search, isItemSpot);
  if (itemSpot !== -1) {
    follow(bot, bot.search, itemSpot);
    return;
  }

  if (cross && cross.tiles.some((t) => isBreakable(world, t))) {
    if (tryBomb(bot, world, player, hypothetical, out)) return;
  }
  const isBlockSpot = (i: number): boolean =>
    i !== hi && bot.danger.start[i] === SAFE && nextToBreakable(world, i);
  let blockSpot = currentGoal(bot, isBlockSpot);
  if (blockSpot === -1) blockSpot = nearest(bot.search, isBlockSpot);
  if (blockSpot !== -1) {
    follow(bot, bot.search, blockSpot);
    return;
  }

  if (!huntFirst && hunt(bot, world, player, hi)) return;
  follow(bot, bot.search, -1);
}

/** Checa a fuga com a bomba hipotética; se houver (ou se o bot "errar"), solta e já foge. */
function tryBomb(bot: Bot, world: World, player: Player, bomb: Bomb, out: Command[]): boolean {
  const mistake = bot.rng.next() < bot.config.level.mistakeChance;
  computeDanger(world, bot.dangerWithBomb, bomb);
  searchPaths(
    world,
    bot.dangerWithBomb,
    moverOf(world, player),
    bot.config.escapeMarginTicks,
    bot.searchWithBomb,
  );
  const escape = nearest(bot.searchWithBomb, (i) => bot.dangerWithBomb.start[i] === SAFE);
  if (escape === -1 && !mistake) return false;

  out.push({ type: 'bomb', playerId: bot.playerId });
  follow(bot, bot.searchWithBomb, escape);
  return true;
}

/** Vai para o tile seguro alcançável mais perto do inimigo vivo mais próximo. */
function hunt(bot: Bot, world: World, player: Player, hi: number): boolean {
  const enemies = world.players.filter((p) => p.alive && p.id !== player.id);
  if (enemies.length === 0) return false;
  const { cols } = world.grid;
  let goal = -1;
  let bestDist = Infinity;
  let bestTime = UNREACHABLE;
  const { time } = bot.search;
  for (let i = 0; i < time.length; i++) {
    const t = time[i] ?? UNREACHABLE;
    if (t === UNREACHABLE || bot.danger.start[i] !== SAFE) continue;
    const x = i % cols;
    const y = Math.floor(i / cols);
    let dist = Infinity;
    for (const e of enemies) {
      dist = Math.min(dist, Math.abs(Math.round(e.x) - x) + Math.abs(Math.round(e.y) - y));
    }
    if (dist < bestDist || (dist === bestDist && t < bestTime)) {
      goal = i;
      bestDist = dist;
      bestTime = t;
    }
  }
  if (goal === -1 || goal === hi) return false;
  follow(bot, bot.search, goal);
  return true;
}

/**
 * Destino da rota atual, se ainda alcançável e válido. Manter o destino evita "tremer" entre dois
 * alvos equivalentes conforme a posição arredondada muda (o que custava a fuga de bombas).
 */
function currentGoal(bot: Bot, ok: (i: number) => boolean): number {
  const goal = bot.path[bot.path.length - 1];
  if (goal === undefined || (bot.search.time[goal] ?? UNREACHABLE) === UNREACHABLE) return -1;
  return ok(goal) ? goal : -1;
}

/** Tile alcançável de menor tempo que satisfaz `ok` (desempate: menor índice); -1 se nenhum. */
function nearest(search: PathSearch, ok: (i: number) => boolean): number {
  let goal = -1;
  let best = UNREACHABLE;
  for (let i = 0; i < search.time.length; i++) {
    const t = search.time[i] ?? UNREACHABLE;
    if (t < best && ok(i)) {
      best = t;
      goal = i;
    }
  }
  return goal;
}

/** Sem saída segura: o tile alcançável cujo perigo começa mais tarde. */
function latestDanger(search: PathSearch, danger: DangerMap): number {
  let goal = -1;
  let latest = -1;
  for (let i = 0; i < search.time.length; i++) {
    if ((search.time[i] ?? UNREACHABLE) === UNREACHABLE) continue;
    const start = danger.start[i] ?? SAFE;
    if (start > latest) {
      latest = start;
      goal = i;
    }
  }
  return goal;
}

function follow(bot: Bot, search: PathSearch, goal: number): void {
  bot.pathStep = 0;
  if (goal === -1) bot.path.length = 0;
  else pathTo(search, goal, bot.path);
}

function canPlaceBomb(world: World, player: Player, here: Point): boolean {
  const active = world.bombs.filter((b) => b.ownerId === player.id).length;
  if (active >= player.maxBombs || bombAt(world, here.x, here.y)) return false;
  const id = tileAt(world.grid, here.x, here.y);
  return id !== undefined && world.terrains.get(id)?.allowsBomb === true;
}

function enemyAt(world: World, player: Player, t: Point): boolean {
  return world.players.some(
    (p) => p.alive && p.id !== player.id && Math.round(p.x) === t.x && Math.round(p.y) === t.y,
  );
}

function isBreakable(world: World, t: Point): boolean {
  const id = tileAt(world.grid, t.x, t.y);
  const terrain = id === undefined ? undefined : world.terrains.get(id);
  return terrain?.destructible === true && terrain.blocksFire;
}

function nextToBreakable(world: World, i: number): boolean {
  const x = i % world.grid.cols;
  const y = Math.floor(i / world.grid.cols);
  return (
    isBreakable(world, { x, y: y - 1 }) ||
    isBreakable(world, { x: x + 1, y }) ||
    isBreakable(world, { x, y: y + 1 }) ||
    isBreakable(world, { x: x - 1, y })
  );
}

/** Direção para seguir a rota neste tick (null = parado). Rota bloqueada força nova decisão. */
function steer(bot: Bot, world: World, player: Player): Direction | null {
  const { cols } = world.grid;
  const tx = Math.round(player.x);
  const ty = Math.round(player.y);
  const here = ty * cols + tx;

  while (bot.pathStep < bot.path.length && bot.path[bot.pathStep] === here) {
    if (bot.pathStep === bot.path.length - 1) break;
    bot.pathStep++;
  }
  const target = bot.path[bot.pathStep];
  if (target === undefined) return null;

  const gx = target % cols;
  const gy = Math.floor(target / cols);
  if (target === here) {
    // Destino: anda até perto do centro e para.
    const dx = gx - player.x;
    const dy = gy - player.y;
    const budget = playerSpeed(world, player) / world.rules.tickRate;
    if (Math.abs(dx) + Math.abs(dy) <= budget) {
      bot.path.length = 0;
      return null;
    }
    if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'down' : 'up';
  }

  if (Math.abs(gx - tx) + Math.abs(gy - ty) !== 1 || bombAt(world, gx, gy)) {
    // Saiu da rota ou uma bomba apareceu no caminho: replaneja já.
    bot.path.length = 0;
    bot.forceDecision = true;
    return null;
  }
  if (gx > tx) return 'right';
  if (gx < tx) return 'left';
  return gy > ty ? 'down' : 'up';
}
