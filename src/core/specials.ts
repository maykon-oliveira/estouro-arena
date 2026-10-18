import type { GameEvent } from '../events';
import { bombAt } from './bombs';
import { DIRECTION_VECTORS, type Direction } from './direction';
import { inBounds, setTile, tileAt, type Point } from './grid';
import { canStand } from './mounts';
import { BLOCK, FLOOR } from './terrainIds';
import type { Player, World } from './world';

/** Especial do personagem (src/data/characters.json, durações já em ticks). */
export type SpecialDef =
  | { type: 'teleport'; tiles: number }
  | { type: 'charm'; durationTicks: number }
  | { type: 'dash'; tiles: number; ticksPerTile: number };

export type SpecialType = SpecialDef['type'];

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
};

/**
 * Comando `special`: com a barra cheia e o especial possível, usa e gasta a barra.
 * Impossível agora (pouso inválido, sem rival…): nada acontece e a barra fica cheia.
 */
export function useSpecial(world: World, player: Player, out: GameEvent[]): void {
  const def = specialOf(world, player);
  if (!def || player.character === null || player.energy < world.rules.energyMax) return;
  if (player.jump || player.dash) return;
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

/** Fim do encanto: a direção segurada volta ao normal. */
export function updateCharm(player: Player): void {
  if (player.charmTicks === 0) return;
  player.charmTicks--;
  if (player.charmTicks === 0) player.moveDir = invert(player.moveDir);
}
