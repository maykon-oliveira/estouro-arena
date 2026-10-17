import type { GameEvent } from '../events';
import type { Grid } from './grid';
import type { Rng } from './rng';
import { BLOCK } from './terrainIds';
import type { Player, Rules, World } from './world';

/** Habilidades dadas por itens (ids iguais aos dos itens em src/data/items.json). */
export const ABILITY_PIERCE = 'perfurante';
export const ABILITY_PASS_BLOCKS = 'atravessa_bloco';
export const ABILITY_KICK = 'chute';
export const ABILITY_REMOTE = 'remota';

/** Efeitos de item que o core sabe aplicar (o `effect` de cada entrada de items.json). */
export type ItemEffect =
  | { effect: 'extra_bomb'; amount: number }
  | { effect: 'extra_range'; amount: number }
  | { effect: 'max_range' }
  | { effect: 'extra_speed'; amount: number }
  | { effect: 'ability'; ability: string };

export type ItemDef = { id: string } & ItemEffect;

export const ITEM_EFFECT_IDS = [
  'extra_bomb',
  'extra_range',
  'max_range',
  'extra_speed',
  'ability',
] as const satisfies readonly ItemEffect['effect'][];

/**
 * Aplica o efeito do item. É o único lugar que conhece os efeitos: item novo com efeito
 * existente é só uma entrada no JSON.
 */
export function applyItem(player: Player, item: ItemDef, rules: Rules): void {
  switch (item.effect) {
    case 'extra_bomb':
      player.maxBombs = Math.min(rules.maxBombs, player.maxBombs + item.amount);
      break;
    case 'extra_range':
      player.range = Math.min(rules.maxRange, player.range + item.amount);
      break;
    case 'max_range':
      player.range = rules.maxRange;
      break;
    case 'extra_speed':
      player.speedLevel = Math.min(rules.maxSpeedLevel, player.speedLevel + item.amount);
      break;
    case 'ability':
      player.abilities.add(item.ability);
      break;
  }
}

/**
 * Esconde itens nos blocos: embaralha os índices dos blocos (Fisher–Yates) e põe um item em
 * cada um, na ordem da lista. Itens a mais que blocos são descartados.
 */
export function hideItems(
  grid: Grid,
  counts: Readonly<Record<string, number>>,
  rng: Rng,
): (string | null)[] {
  const hidden = new Array<string | null>(grid.tiles.length).fill(null);
  const blocks: number[] = [];
  grid.tiles.forEach((id, i) => {
    if (id === BLOCK) blocks.push(i);
  });
  for (let i = blocks.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    const tmp = blocks[i] ?? 0;
    blocks[i] = blocks[j] ?? 0;
    blocks[j] = tmp;
  }

  let next = 0;
  for (const [itemId, count] of Object.entries(counts)) {
    for (let k = 0; k < count && next < blocks.length; k++) {
      hidden[blocks[next++] ?? 0] = itemId;
    }
  }
  return hidden;
}

/** Coleta: cada jogador vivo (em ordem de id) pega o item visível do seu tile. */
export function collectItems(world: World, out: GameEvent[]): void {
  for (const player of world.players) {
    if (!player.alive) continue;
    const x = Math.round(player.x);
    const y = Math.round(player.y);
    const i = y * world.grid.cols + x;
    const itemId = world.items[i];
    if (itemId === null || itemId === undefined) continue;
    world.items[i] = null;
    const item = world.itemDefs.get(itemId);
    if (item) applyItem(player, item, world.rules);
    out.push({ type: 'item.pego', playerId: player.id, itemId, x, y });
  }
}

/** Velocidade atual do jogador, em tiles por segundo (sem o terreno). */
export function playerSpeed(world: World, player: Player): number {
  return world.rules.playerSpeed + player.speedLevel * world.rules.speedStep;
}
