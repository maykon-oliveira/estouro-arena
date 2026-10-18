import { bombAt, explosionTiles } from '../bombs';
import type { Command } from '../commands';
import type { Direction } from '../direction';
import { tileAt, type Point } from '../grid';
import { DIRECTION_VECTORS } from '../direction';
import { ringPoint, ringPosition, throwTarget, type Ghost } from '../ghost';
import { ABILITY_PIERCE, playerSpeed } from '../items';
import { canStand } from '../mounts';
import { dashReach, specialOf, teleportLanding, tideLine } from '../specials';
import { BLOCK } from '../terrainIds';
import type { Match } from '../match';
import { createRng, type Rng } from '../rng';
import type { Bomb, Player, World } from '../world';
import {
  computeDanger,
  createDangerMap,
  SAFE,
  type DangerMap,
  type DangerOptions,
} from './dangerMap';
import {
  createPathSearch,
  moverOf,
  isSlipperyTile,
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
  /** Morte súbita: quantos ticks à frente o bot enxerga a queda dos tiles. */
  collapseHorizonTicks?: number;
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
  /** Detonou a remota nesta decisão (as próprias remotas contam como explodindo agora). */
  detonating: boolean;
  /** Fantasma: direção escolhida na última decisão. */
  ghostDir: Direction | null;
  /** Fantasma que o bot está controlando (outro = acabou de surgir). */
  ghostRef: Ghost | null;
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
    detonating: false,
    ghostDir: null,
    ghostRef: null,
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
  if (!player) return;
  if (!player.alive) {
    bot.path.length = 0;
    if (player.ghost) ghostBrain(bot, world, player, out);
    return;
  }
  // No ar (pulo do sapo) ou em disparada não há o que decidir nem para onde andar.
  if (player.jump || player.dash) return;

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

  computeDanger(world, bot.danger, view(bot, player));
  // Remota: se vale detonar, planeja esta decisão como se as próprias remotas explodissem agora
  // (as chamas duram; a rota precisa desviar delas). Só detona se o tile atual ficar fora.
  bot.detonating = false;
  // Deslizando no gelo o bot não controla para onde vai: não detona agora.
  if (player.iceSlide === null && worthDetonating(world, player)) {
    computeDanger(world, bot.danger, { ...view(bot, player), detonateOwn: true });
    if (bot.danger.start[hi] === SAFE) {
      out.push({ type: 'remote', playerId: player.id });
      bot.detonating = true;
    } else {
      computeDanger(world, bot.danger, view(bot, player));
    }
  }
  searchPaths(world, bot.danger, moverOf(world, player), margin, bot.search);

  // 1. Fugir.
  if ((bot.danger.start[hi] ?? SAFE) !== SAFE) {
    const safe = (i: number): boolean => bot.danger.start[i] === SAFE;
    let goal = currentGoal(bot, (i) => safe(i));
    if (goal === -1) goal = nearest(world, bot.search, safe);
    if (goal === -1 && teleportToSafety(bot, world, player, out)) return;
    if (goal === -1 && jumpToSafety(bot, world, player, out)) return;
    if (goal === -1) goal = latestDanger(world, bot.search, bot.danger);
    follow(bot, bot.search, goal);
    return;
  }

  // Especial com a barra cheia (Boto encanta e segue; Mula dispara e espera chegar).
  if (useSpecialOpportunity(bot, world, player, out)) return;

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

  // Morte súbita: sai da borda que vai cair antes de pensar em item, bloco ou caça.
  if (retreat(bot, world, hi)) return;

  // 3/4/5. Item, abrir caminho ou caçar (a agressividade decide se caça primeiro).
  const huntFirst = bot.rng.next() < bot.config.level.aggression;
  if (huntFirst && hunt(bot, world, player, hi)) return;

  const isItemSpot = (i: number): boolean =>
    i !== hi &&
    wants(world, player, world.items[i] ?? null) &&
    bot.danger.start[i] === SAFE &&
    Math.abs((i % cols) - here.x) + Math.abs(Math.floor(i / cols) - here.y) <=
      bot.config.level.itemSearchTiles;
  let itemSpot = currentGoal(bot, isItemSpot);
  if (itemSpot === -1) itemSpot = nearest(world, bot.search, isItemSpot);
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
  if (blockSpot === -1) blockSpot = nearest(world, bot.search, isBlockSpot);
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
  // Se acabou de detonar a remota, as próprias remotas explodem agora também nesta checagem.
  computeDanger(world, bot.dangerWithBomb, {
    ...view(bot, player),
    extra: bomb,
    detonateOwn: bot.detonating,
  });
  searchPaths(
    world,
    bot.dangerWithBomb,
    moverOf(world, player),
    bot.config.escapeMarginTicks,
    bot.searchWithBomb,
  );
  const escape = nearest(world, bot.searchWithBomb, (i) => bot.dangerWithBomb.start[i] === SAFE);
  if (escape === -1 && !mistake) return false;

  out.push({ type: 'bomb', playerId: bot.playerId });
  follow(bot, bot.searchWithBomb, escape);
  return true;
}

/** O que o bot enxerga no mapa de perigo: quem é ele e o horizonte da morte súbita. */
function view(bot: Bot, player: Player): DangerOptions {
  return { viewerId: player.id, collapseHorizonTicks: bot.config.collapseHorizonTicks ?? 0 };
}

/**
 * Morte súbita: se o tile do bot cai logo (menos de 2 × o horizonte), vai para o tile seguro
 * alcançável que cai mais tarde (rumo ao centro).
 */
function retreat(bot: Bot, world: World, hi: number): boolean {
  const collapse = world.collapse;
  const horizon = bot.config.collapseHorizonTicks ?? 0;
  if (!collapse || horizon === 0) return false;
  const dropHere = (collapse.dropAt[hi] ?? SAFE) - world.tick;
  if (dropHere >= 2 * horizon) return false;
  let goal = -1;
  let latest = dropHere;
  for (let i = 0; i < bot.search.time.length; i++) {
    if ((bot.search.time[i] ?? UNREACHABLE) === UNREACHABLE || bot.danger.start[i] !== SAFE)
      continue;
    if (isSlipperyTile(world, i)) continue;
    const drop = (collapse.dropAt[i] ?? SAFE) - world.tick;
    if (drop > latest) {
      latest = drop;
      goal = i;
    }
  }
  if (goal === -1) return false;
  follow(bot, bot.search, goal);
  return true;
}

/** Remota: vale detonar a mais antiga (a que o `remote` detona) se ela pega inimigo ou bloco. */
function worthDetonating(world: World, player: Player): boolean {
  let oldest: Bomb | undefined;
  for (const b of world.bombs) {
    if (b.remote && b.ownerId === player.id && (!oldest || b.id < oldest.id)) oldest = b;
  }
  if (!oldest) return false;
  return explosionTiles(world, oldest).tiles.some(
    (t) => enemyAt(world, player, t) || isBreakable(world, t),
  );
}

/**
 * Bot fantasma: anda pelo anel até o ponto mais perto da linha ou coluna do inimigo vivo mais
 * próximo e arremessa quando a cruz no pouso pega um inimigo (fácil: assim que houver pouso).
 */
function ghostBrain(bot: Bot, world: World, player: Player, out: Command[]): void {
  const ghost = player.ghost;
  if (!ghost) return;
  // Fantasma novo: o último `move` emitido era do jogador vivo.
  if (bot.ghostRef !== ghost) {
    bot.ghostRef = ghost;
    bot.lastDir = undefined;
    bot.ghostDir = null;
  }
  let dir: Direction | null = null;
  if (!ghost.thrown && world.tick >= bot.nextDecisionTick) {
    bot.nextDecisionTick = world.tick + bot.config.level.reactionTicks;
    const target = throwTarget(world, ghost);
    const eager = bot.config.level.aggression < 0.5;
    if (target && (eager || landingHitsEnemy(world, player, target))) {
      out.push({ type: 'bomb', playerId: player.id });
    } else {
      dir = ghostHeading(world, player);
    }
    bot.ghostDir = dir;
  } else if (!ghost.thrown) {
    dir = bot.ghostDir;
  }
  if (dir !== bot.lastDir) {
    bot.lastDir = dir;
    out.push({ type: 'move', playerId: player.id, dir });
  }
}

/** A cruz de uma bomba no pouso pegaria algum inimigo vivo (visto)? */
function landingHitsEnemy(world: World, player: Player, at: Point): boolean {
  const bomb: Bomb = {
    id: -1,
    ownerId: player.id,
    x: at.x,
    y: at.y,
    fuse: world.rules.fuseTicks,
    range: world.rules.startRange,
  };
  return explosionTiles(world, bomb, [...world.bombs, bomb]).tiles.some((t) =>
    enemyAt(world, player, t),
  );
}

/** Direção para andar no anel rumo ao alinhamento com o inimigo vivo mais próximo. */
function ghostHeading(world: World, player: Player): Direction | null {
  const ghost = player.ghost;
  if (!ghost) return null;
  const { grid } = world;
  const w = grid.cols - 1;
  const h = grid.rows - 1;
  const perimeter = 2 * (w + h);
  let best: number | null = null;
  let bestDist = Infinity;
  for (const e of world.players) {
    if (!e.alive || e.id === player.id) continue;
    const ex = Math.round(e.x);
    const ey = Math.round(e.y);
    // Pontos do anel alinhados com o inimigo (fora das quinas).
    for (const s of [
      ringPosition(grid, ex, 0),
      ringPosition(grid, ex, h),
      ringPosition(grid, 0, ey),
      ringPosition(grid, w, ey),
    ]) {
      const raw = Math.abs(s - ghost.s);
      const dist = Math.min(raw, perimeter - raw);
      if (dist < bestDist) {
        bestDist = dist;
        best = s;
      }
    }
  }
  if (best === null || bestDist < 0.5) return null;
  const forward = (((best - ghost.s) % perimeter) + perimeter) % perimeter;
  const sign = forward <= perimeter / 2 ? 1 : -1;
  // Direção que dá esse sentido no lado atual.
  const { x, y } = ringPoint(grid, ghost.s);
  if (y < 0.5 && x < w - 0.5) return sign > 0 ? 'right' : 'left';
  if (x > w - 0.5 && y < h - 0.5) return sign > 0 ? 'down' : 'up';
  if (y > h - 0.5 && x > 0.5) return sign > 0 ? 'left' : 'right';
  return sign > 0 ? 'up' : 'down';
}

/** O bot quer o item? Ovo só se não estiver montado (montado, o ovo nem é pego). */
function wants(world: World, player: Player, itemId: string | null): boolean {
  if (itemId === null) return false;
  return !(world.itemDefs.get(itemId)?.effect === 'mount' && player.mount !== null);
}

/** Barra cheia e o especial é do tipo pedido? */
function specialReady(world: World, player: Player, type: string): boolean {
  return player.energy >= world.rules.energyMax && specialOf(world, player)?.type === type;
}

/** Sem saída a pé: o Saci com a barra cheia teleporta se o pouso à frente for seguro. */
function teleportToSafety(bot: Bot, world: World, player: Player, out: Command[]): boolean {
  const def = specialOf(world, player);
  if (def?.type !== 'teleport' || !specialReady(world, player, 'teleport')) return false;
  const landing = teleportLanding(world, player, def.tiles);
  if (!landing || bot.danger.start[landing.y * world.grid.cols + landing.x] !== SAFE) return false;
  out.push({ type: 'special', playerId: player.id });
  bot.path.length = 0;
  return true;
}

/** Até onde o Boto encanta, o Curupira solta o clone e a Mula olha à frente (tiles). */
const SPECIAL_REACH = 4;
/** O Boitatá acende o rastro com um inimigo a até 3 tiles. */
const TRAIL_REACH = 3;

/**
 * Fora de perigo, com a barra cheia: o Boto encanta o rival mais próximo se ele estiver a até
 * 4 tiles, o Boitatá acende o rastro com um inimigo a até 3, a Iara solta a maré com um inimigo
 * na linha à frente e o Curupira solta o clone com um inimigo a até 4 (e todos seguem a
 * decisão); a Mula dispara se há bloco no caminho à frente e todo o percurso é seguro (e para
 * de decidir até chegar).
 */
function useSpecialOpportunity(bot: Bot, world: World, player: Player, out: Command[]): boolean {
  const def = specialOf(world, player);
  if (!def || player.energy < world.rules.energyMax || player.iceSlide !== null) return false;
  if (player.specialTicks > 0) return false;
  const within = (reach: number): boolean =>
    targets(world, player).some(
      (p) => Math.abs(p.x - player.x) + Math.abs(p.y - player.y) <= reach,
    );
  if (def.type === 'fireTrail' || def.type === 'decoy') {
    if (within(def.type === 'fireTrail' ? TRAIL_REACH : SPECIAL_REACH)) {
      out.push({ type: 'special', playerId: player.id });
    }
    return false;
  }
  if (def.type === 'tide') {
    const line = new Set(tideLine(world, player));
    const cols = world.grid.cols;
    const inLine = targets(world, player).some((p) =>
      line.has(Math.round(p.y) * cols + Math.round(p.x)),
    );
    if (inLine) out.push({ type: 'special', playerId: player.id });
    return false;
  }
  if (def.type === 'charm') {
    const near = world.players.some(
      (p) =>
        p !== player &&
        p.alive &&
        Math.abs(p.x - player.x) + Math.abs(p.y - player.y) <= SPECIAL_REACH,
    );
    if (near) out.push({ type: 'special', playerId: player.id });
    return false;
  }
  if (def.type === 'dash') {
    const reach = dashReach(world, player, def.tiles);
    if (reach === 0) return false;
    const { dx, dy } = DIRECTION_VECTORS[player.facing];
    const x0 = Math.round(player.x);
    const y0 = Math.round(player.y);
    let hitsBlock = false;
    for (let d = 1; d <= reach; d++) {
      const i = (y0 + dy * d) * world.grid.cols + (x0 + dx * d);
      if (bot.danger.start[i] !== SAFE) return false;
      if (world.grid.tiles[i] === BLOCK) hitsBlock = true;
    }
    if (!hitsBlock) return false;
    out.push({ type: 'special', playerId: player.id });
    bot.path.length = 0;
    return true;
  }
  return false;
}

/**
 * Sem saída a pé: montado no sapo e com o pulo pronto, pula se o pouso na direção em que está
 * virado for seguro.
 */
function jumpToSafety(bot: Bot, world: World, player: Player, out: Command[]): boolean {
  const mount = player.mount === null ? undefined : world.mountDefs.get(player.mount);
  if (!mount || mount.ability !== 'jump' || player.abilityCooldown > 0) return false;
  const { dx, dy } = DIRECTION_VECTORS[player.facing];
  const x = Math.round(player.x) + dx * mount.jumpTiles;
  const y = Math.round(player.y) + dy * mount.jumpTiles;
  if (!canStand(world, player, x, y) || bombAt(world, x, y)) return false;
  if (bot.danger.start[y * world.grid.cols + x] !== SAFE) return false;
  out.push({ type: 'mount', playerId: player.id });
  bot.path.length = 0;
  return true;
}

/** Vai para o tile seguro alcançável mais perto do inimigo vivo mais próximo. */
/**
 * Inimigos que o bot considera: rivais vivos e os clones da Pegada falsa dos outros (o bot não
 * distingue o clone do Curupira de verdade).
 */
function targets(world: World, player: Player): Player[] {
  const list = world.players.filter((p) => p.alive && p.id !== player.id);
  for (const d of world.decoys) if (d.ownerId !== player.id) list.push(d.body);
  return list;
}

function hunt(bot: Bot, world: World, player: Player, hi: number): boolean {
  const enemies = targets(world, player).filter((p) => sees(world, player, p));
  if (enemies.length === 0) return false;
  const { cols } = world.grid;
  let goal = -1;
  let bestDist = Infinity;
  let bestTime = UNREACHABLE;
  const { time } = bot.search;
  for (let i = 0; i < time.length; i++) {
    const t = time[i] ?? UNREACHABLE;
    if (t === UNREACHABLE || bot.danger.start[i] !== SAFE || isSlipperyTile(world, i)) continue;
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

/**
 * Tile alcançável de menor tempo que satisfaz `ok` (desempate: menor índice); -1 se nenhum.
 * Nunca escolhe gelo: o bot não consegue parar no meio dele.
 */
function nearest(world: World, search: PathSearch, ok: (i: number) => boolean): number {
  let goal = -1;
  let best = UNREACHABLE;
  for (let i = 0; i < search.time.length; i++) {
    const t = search.time[i] ?? UNREACHABLE;
    if (t < best && !isSlipperyTile(world, i) && ok(i)) {
      best = t;
      goal = i;
    }
  }
  return goal;
}

/** Sem saída segura: o tile alcançável cujo perigo começa mais tarde. */
function latestDanger(world: World, search: PathSearch, danger: DangerMap): number {
  let goal = -1;
  let latest = -1;
  for (let i = 0; i < search.time.length; i++) {
    if ((search.time[i] ?? UNREACHABLE) === UNREACHABLE || isSlipperyTile(world, i)) continue;
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
  return targets(world, player).some(
    (p) => Math.round(p.x) === t.x && Math.round(p.y) === t.y && sees(world, player, p),
  );
}

/** Quem está num tile que esconde (mato) só é visto a até 1 tile de distância. */
function sees(world: World, viewer: Player, target: Player): boolean {
  const tx = Math.round(target.x);
  const ty = Math.round(target.y);
  const id = tileAt(world.grid, tx, ty);
  if (id === undefined || world.terrains.get(id)?.hides !== true) return true;
  return Math.abs(Math.round(viewer.x) - tx) + Math.abs(Math.round(viewer.y) - ty) <= 1;
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
