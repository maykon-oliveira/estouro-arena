import type { GameEvent } from '../events';
import { bombAt } from './bombs';
import { DIRECTION_VECTORS, type Direction } from './direction';
import { inBounds, setTile, tileAt, type Point } from './grid';
import { canStand } from './mounts';
import { movePlayer } from './movement';
import { BLOCK, FLOOR } from './terrainIds';
import type { Player, World } from './world';

/** Especial do personagem (src/data/characters.json, durações já em ticks). */
export type SpecialDef =
  | { type: 'teleport'; tiles: number }
  | { type: 'charm'; durationTicks: number }
  | { type: 'dash'; tiles: number; ticksPerTile: number }
  | { type: 'fireTrail'; durationTicks: number }
  | { type: 'tide'; durationTicks: number; speedMultiplier: number }
  | { type: 'decoy'; durationTicks: number };

export type SpecialType = SpecialDef['type'];

/** Clone da Pegada falsa: um corpo que anda espelhando o dono (as mesmas regras de movimento). */
export interface Decoy {
  ownerId: number;
  /** Corpo do clone (forma de jogador, sem passiva nem itens), movido por `movePlayer`. */
  body: Player;
  ticksLeft: number;
}

/** Disparada em andamento: linha reta do centro de partida ao de chegada. */
export interface Dash {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  ticksLeft: number;
  totalTicks: number;
}

const OPPOSITE: Readonly<Record<Direction, Direction>> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

/** Direção invertida (encanto do Boto); null continua null. */
export function invert(dir: Direction | null): Direction | null {
  return dir === null ? null : OPPOSITE[dir];
}

/** Soma energia (só vivo), sem passar do máximo; avisa ao encher. */
export function addEnergy(world: World, player: Player, amount: number, out: GameEvent[]): void {
  if (!player.alive || amount <= 0) return;
  const max = world.rules.energyMax;
  const before = player.energy;
  player.energy = Math.min(max, before + amount);
  if (before < max && player.energy === max) {
    out.push({ type: 'energia.cheia', playerId: player.id });
  }
}

/** Especial do personagem do jogador (undefined sem personagem ou sem especial). */
export function specialOf(world: World, player: Player): SpecialDef | undefined {
  return player.character === null ? undefined : world.characterDefs.get(player.character)?.special;
}

type Handler<T extends SpecialType> = (
  world: World,
  player: Player,
  def: Extract<SpecialDef, { type: T }>,
  out: GameEvent[],
) => boolean;

/** Um handler por tipo de especial: devolve false se o especial não é possível agora. */
const HANDLERS: { [T in SpecialType]: Handler<T> } = {
  teleport: teleport,
  charm: charm,
  dash: dash,
  fireTrail: fireTrail,
  tide: tide,
  decoy: decoy,
};

/**
 * Comando `special`: com a barra cheia e o especial possível, usa e gasta a barra.
 * Impossível agora (pouso inválido, sem rival…): nada acontece e a barra fica cheia.
 */
export function useSpecial(world: World, player: Player, out: GameEvent[]): void {
  const def = specialOf(world, player);
  if (!def || player.character === null || player.energy < world.rules.energyMax) return;
  // No ar, em disparada ou com um especial ainda durando, espera.
  if (player.jump || player.dash || player.specialTicks > 0) return;
  const handler = HANDLERS[def.type] as Handler<SpecialType>;
  if (!handler(world, player, def, out)) return;
  player.energy = 0;
  out.push({
    type: 'especial.usado',
    playerId: player.id,
    characterId: player.character,
    special: def.type,
  });
}

/** Pouso do Redemoinho: o mais longe, até `tiles` à frente, onde dá para ficar e sem bomba. */
export function teleportLanding(world: World, player: Player, tiles: number): Point | null {
  const { dx, dy } = DIRECTION_VECTORS[player.facing];
  const fromX = Math.round(player.x);
  const fromY = Math.round(player.y);
  for (let d = tiles; d >= 1; d--) {
    const x = fromX + dx * d;
    const y = fromY + dy * d;
    if (canStand(world, player, x, y) && !bombAt(world, x, y)) return { x, y };
  }
  return null;
}

/** Saci: reaparece a `tiles` à frente; se o pouso não servir, tenta mais perto. */
function teleport(
  world: World,
  player: Player,
  def: Extract<SpecialDef, { type: 'teleport' }>,
): boolean {
  const landing = teleportLanding(world, player, def.tiles);
  if (!landing) return false;
  player.x = landing.x;
  player.y = landing.y;
  player.iceSlide = null;
  return true;
}

/**
 * Quantos tiles a Disparada anda à frente (0 = nenhum): bloco quebrável não para; parede,
 * terreno onde não pode ficar, bomba ou borda param antes.
 */
export function dashReach(world: World, player: Player, tiles: number): number {
  const { dx, dy } = DIRECTION_VECTORS[player.facing];
  const fromX = Math.round(player.x);
  const fromY = Math.round(player.y);
  let reach = 0;
  for (let d = 1; d <= tiles; d++) {
    const x = fromX + dx * d;
    const y = fromY + dy * d;
    if (!inBounds(world.grid, x, y) || bombAt(world, x, y)) break;
    if (tileAt(world.grid, x, y) !== BLOCK && !canStand(world, player, x, y)) break;
    reach = d;
  }
  return reach;
}

/** Boto: inverte os controles do rival vivo mais próximo (empate: menor id). */
function charm(world: World, player: Player, def: Extract<SpecialDef, { type: 'charm' }>): boolean {
  let target: Player | undefined;
  let best = Infinity;
  for (const p of world.players) {
    if (p === player || !p.alive) continue;
    const d = Math.abs(p.x - player.x) + Math.abs(p.y - player.y);
    if (d < best) {
      best = d;
      target = p;
    }
  }
  if (!target) return false;
  // Já encantado: só reinicia a duração (a direção segurada já está invertida).
  if (target.charmTicks === 0) target.moveDir = invert(target.moveDir);
  target.charmTicks = def.durationTicks;
  return true;
}

/**
 * Mula: corre até `tiles` à frente, quebrando os blocos do caminho na hora; para antes de
 * parede, terreno onde não pode ficar ou bomba.
 */
function dash(
  world: World,
  player: Player,
  def: Extract<SpecialDef, { type: 'dash' }>,
  out: GameEvent[],
): boolean {
  const reach = dashReach(world, player, def.tiles);
  if (reach === 0) return false;
  const { dx, dy } = DIRECTION_VECTORS[player.facing];
  const fromX = Math.round(player.x);
  const fromY = Math.round(player.y);

  for (let d = 1; d <= reach; d++) {
    const x = fromX + dx * d;
    const y = fromY + dy * d;
    if (tileAt(world.grid, x, y) !== BLOCK) continue;
    // Bloco "atravessável" (atravessa_bloco) também quebra: a Mula derruba.
    setTile(world.grid, x, y, FLOOR);
    out.push({ type: 'bloco.destruido', x, y });
    const i = y * world.grid.cols + x;
    const hidden = world.hiddenItems[i];
    if (hidden !== null && hidden !== undefined) {
      world.hiddenItems[i] = null;
      world.items[i] = hidden;
      out.push({ type: 'item.revelado', itemId: hidden, x, y });
    }
  }

  const totalTicks = Math.max(1, reach * def.ticksPerTile);
  player.dash = {
    fromX,
    fromY,
    toX: fromX + dx * reach,
    toY: fromY + dy * reach,
    ticksLeft: totalTicks,
    totalTicks,
  };
  player.x = fromX;
  player.y = fromY;
  player.iceSlide = null;
  return true;
}

/** Um tick de disparada: avança em linha reta; ao fim, para no centro do tile de chegada. */
export function advanceDash(player: Player): void {
  const dash = player.dash;
  if (!dash) return;
  dash.ticksLeft--;
  const t = 1 - dash.ticksLeft / dash.totalTicks;
  player.x = dash.fromX + (dash.toX - dash.fromX) * t;
  player.y = dash.fromY + (dash.toY - dash.fromY) * t;
  if (dash.ticksLeft <= 0) {
    player.x = dash.toX;
    player.y = dash.toY;
    player.dash = null;
  }
}

/** Boitatá: por um tempo, deixa chama (dele) em cada tile em que está. */
function fireTrail(
  _world: World,
  player: Player,
  def: Extract<SpecialDef, { type: 'fireTrail' }>,
): boolean {
  player.specialTicks = def.durationTicks;
  return true;
}

/**
 * Tiles da Maré: do tile da Iara, na direção em que está virada, até antes do primeiro tile
 * onde não se anda (parede, bloco, água funda) ou da borda.
 */
export function tideLine(world: World, player: Player): number[] {
  const { dx, dy } = DIRECTION_VECTORS[player.facing];
  const tiles: number[] = [];
  let x = Math.round(player.x);
  let y = Math.round(player.y);
  while (inBounds(world.grid, x, y)) {
    const id = tileAt(world.grid, x, y);
    if (id === undefined || world.terrains.get(id)?.walkable !== true) break;
    tiles.push(y * world.grid.cols + x);
    x += dx;
    y += dy;
  }
  return tiles;
}

/** Iara: alaga a linha à frente; quem não é a Iara anda mais devagar nela. */
function tide(world: World, player: Player, def: Extract<SpecialDef, { type: 'tide' }>): boolean {
  const tiles = tideLine(world, player);
  if (tiles.length === 0) return false;
  for (const i of tiles) {
    world.tideTicks[i] = def.durationTicks;
    world.tideOwner[i] = player.id;
  }
  world.tideMultiplier = def.speedMultiplier;
  player.specialTicks = def.durationTicks;
  return true;
}

/** Curupira: cria o clone no tile dele, parado, virado para o mesmo lado. */
function decoy(world: World, player: Player, def: Extract<SpecialDef, { type: 'decoy' }>): boolean {
  const x = Math.round(player.x);
  const y = Math.round(player.y);
  const body: Player = {
    ...player,
    x,
    y,
    moveDir: invert(player.moveDir),
    iceSlide: null,
    speedLevel: player.speedLevel,
    abilities: new Set<string>(),
    mount: null,
    invulnerableTicks: 0,
    jump: null,
    dash: null,
    ghost: null,
    character: null,
    flameShields: 0,
    energy: 0,
    charmTicks: 0,
    specialTicks: 0,
  };
  world.decoys = world.decoys.filter((d) => d.ownerId !== player.id);
  world.decoys.push({ ownerId: player.id, body, ticksLeft: def.durationTicks });
  player.specialTicks = def.durationTicks;
  return true;
}

/** Multiplicador da Maré no tile `i` para quem anda (1 = sem maré ou é a dona dela). */
export function tideFactor(world: World, moverId: number | undefined, i: number): number {
  if ((world.tideTicks[i] ?? 0) === 0 || world.tideOwner[i] === moverId) return 1;
  return world.tideMultiplier;
}

/**
 * Um tick dos especiais com duração: o rastro do Boitatá põe chama no tile dele, a maré seca,
 * o clone anda espelhado e some na chama (ou se o tile cair); avisa quando cada um acaba.
 */
export function updateSpecials(world: World, out: GameEvent[]): void {
  const { cols } = world.grid;
  for (let i = 0; i < world.tideTicks.length; i++) {
    const left = world.tideTicks[i] ?? 0;
    if (left > 0) world.tideTicks[i] = left - 1;
  }

  for (const player of world.players) {
    if (player.specialTicks === 0) continue;
    const def = specialOf(world, player);
    if (!player.alive || !def) {
      player.specialTicks = 0;
      continue;
    }
    if (def.type === 'fireTrail' && !player.jump) {
      const i = Math.round(player.y) * cols + Math.round(player.x);
      world.flames[i] = Math.max(world.flames[i] ?? 0, world.rules.explosionTicks);
      world.flameOwner[i] = player.id;
      world.flameFromTrail[i] = 1;
      const itemId = world.items[i];
      if (itemId !== null && itemId !== undefined) {
        world.items[i] = null;
        out.push({
          type: 'item.destruido',
          itemId,
          x: i % cols,
          y: Math.floor(i / cols),
        });
      }
    }
    player.specialTicks--;
    if (player.specialTicks === 0 && player.character !== null && def.type !== 'decoy') {
      out.push({
        type: 'especial.terminou',
        playerId: player.id,
        characterId: player.character,
        special: def.type,
      });
    }
  }

  for (const d of world.decoys) {
    const owner = world.players[d.ownerId];
    d.body.moveDir = owner?.alive ? invert(owner.moveDir) : null;
    movePlayer(world, d.body);
    d.ticksLeft--;
  }
  world.decoys = world.decoys.filter((d) => {
    const x = Math.round(d.body.x);
    const y = Math.round(d.body.y);
    const burnt = (world.flames[y * cols + x] ?? 0) > 0;
    const gone = d.ticksLeft <= 0 || burnt || !canStand(world, d.body, x, y);
    if (gone) {
      const owner = world.players[d.ownerId];
      out.push({
        type: 'especial.terminou',
        playerId: d.ownerId,
        characterId: owner?.character ?? '',
        special: 'decoy',
      });
    }
    return !gone;
  });
}

/** Fim do encanto: a direção segurada volta ao normal. */
export function updateCharm(player: Player): void {
  if (player.charmTicks === 0) return;
  player.charmTicks--;
  if (player.charmTicks === 0) player.moveDir = invert(player.moveDir);
}
