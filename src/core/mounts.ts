import type { GameEvent } from '../events';
import { bombAt } from './bombs';
import { DIRECTION_VECTORS } from './direction';
import { tileAt } from './grid';
import { ABILITY_PASS_BLOCKS } from './items';
import { BLOCK } from './terrainIds';
import type { Player, World } from './world';

/** O que a montaria muda num terreno enquanto o jogador está montado. */
export interface TerrainOverride {
  walkable?: boolean;
  speedMultiplier?: number;
}

/** Montaria (src/data/mounts.json, durações já em ticks). */
export type MountDef = {
  id: string;
  /** Sobreposição de campos de terreno por id de terreno (ex.: capivara nada na água funda). */
  terrainOverrides: Readonly<Record<string, TerrainOverride>>;
} & (
  | { ability: null }
  | { ability: 'jump'; jumpTiles: number; jumpTicks: number; cooldownTicks: number }
);

/** Pulo em andamento: vai em linha reta do centro de partida ao de pouso. */
export interface Jump {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  ticksLeft: number;
  totalTicks: number;
}

function override(
  world: World,
  mount: string | null,
  terrainId: string,
): TerrainOverride | undefined {
  return mount === null ? undefined : world.mountDefs.get(mount)?.terrainOverrides[terrainId];
}

/** Terreno andável para quem está (ou não) montado, já com a sobreposição da montaria. */
export function terrainWalkable(world: World, mount: string | null, terrainId: string): boolean {
  return (
    override(world, mount, terrainId)?.walkable ?? world.terrains.get(terrainId)?.walkable === true
  );
}

/** Multiplicador de velocidade do terreno, já com a sobreposição da montaria. */
export function terrainSpeed(world: World, mount: string | null, terrainId: string): number {
  return (
    override(world, mount, terrainId)?.speedMultiplier ??
    world.terrains.get(terrainId)?.speedMultiplier ??
    1
  );
}

/** O jogador pode ficar no tile (x, y)? (montaria e `atravessa_bloco` contam). */
export function canStand(world: World, player: Player, x: number, y: number): boolean {
  const id = tileAt(world.grid, x, y);
  if (id === undefined) return false;
  if (id === BLOCK && player.abilities.has(ABILITY_PASS_BLOCKS)) return true;
  return terrainWalkable(world, player.mount, id);
}

/**
 * Habilidade da montaria (pelo `action`, quando não há remota para detonar).
 * Sapo: pula `jumpTiles` na direção em que o jogador está virado, se o pouso for válido.
 */
export function useMountAbility(world: World, player: Player, out: GameEvent[]): void {
  const mount = player.mount === null ? undefined : world.mountDefs.get(player.mount);
  if (!mount || mount.ability !== 'jump' || player.jump || player.abilityCooldown > 0) return;
  const { dx, dy } = DIRECTION_VECTORS[player.facing];
  const fromX = Math.round(player.x);
  const fromY = Math.round(player.y);
  const toX = fromX + dx * mount.jumpTiles;
  const toY = fromY + dy * mount.jumpTiles;
  if (!canStand(world, player, toX, toY) || bombAt(world, toX, toY)) return;

  player.jump = {
    fromX,
    fromY,
    toX,
    toY,
    ticksLeft: mount.jumpTicks,
    totalTicks: mount.jumpTicks,
  };
  player.abilityCooldown = mount.cooldownTicks;
  player.iceSlide = null;
  out.push({
    type: 'montaria.acao',
    playerId: player.id,
    mountId: mount.id,
    from: { x: fromX, y: fromY },
    to: { x: toX, y: toY },
  });
}

/** Um tick de pulo: avança em linha reta; ao fim, pousa no centro do tile de pouso. */
export function advanceJump(player: Player): void {
  const jump = player.jump;
  if (!jump) return;
  jump.ticksLeft--;
  const t = 1 - jump.ticksLeft / jump.totalTicks;
  player.x = jump.fromX + (jump.toX - jump.fromX) * t;
  player.y = jump.fromY + (jump.toY - jump.fromY) * t;
  if (jump.ticksLeft <= 0) {
    player.x = jump.toX;
    player.y = jump.toY;
    player.jump = null;
  }
}

/** O escudo absorveu uma chama: perde a montaria, fica invulnerável e sai de onde não pode ficar. */
export function loseMount(world: World, player: Player, out: GameEvent[]): void {
  const mountId = player.mount;
  if (mountId === null) return;
  player.mount = null;
  player.invulnerableTicks = world.rules.mountInvulnerableTicks;
  out.push({ type: 'montaria.perdida', playerId: player.id, mountId });

  const x = Math.round(player.x);
  const y = Math.round(player.y);
  if (canStand(world, player, x, y)) return;
  const spot = nearestStandable(world, player, x, y);
  if (spot) {
    player.x = spot.x;
    player.y = spot.y;
    player.iceSlide = null;
  }
}

const NEIGHBORS = ['up', 'right', 'down', 'left'] as const;

/** BFS a partir de (x, y) pelo tile mais próximo onde o jogador pode ficar (desempate fixo). */
function nearestStandable(
  world: World,
  player: Player,
  x: number,
  y: number,
): { x: number; y: number } | null {
  const { cols, rows } = world.grid;
  const seen = new Uint8Array(cols * rows);
  const queue = [{ x, y }];
  seen[y * cols + x] = 1;
  for (let p = queue.shift(); p; p = queue.shift()) {
    for (const dir of NEIGHBORS) {
      const { dx, dy } = DIRECTION_VECTORS[dir];
      const nx = p.x + dx;
      const ny = p.y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || seen[ny * cols + nx]) continue;
      seen[ny * cols + nx] = 1;
      if (canStand(world, player, nx, ny)) return { x: nx, y: ny };
      queue.push({ x: nx, y: ny });
    }
  }
  return null;
}
