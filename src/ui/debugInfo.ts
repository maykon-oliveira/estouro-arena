import { BLOCK } from '../core/terrainIds';
import type { World } from '../core/world';

export interface DebugContext {
  seed: number;
  mapId: string;
  fps: number;
}

/** Valores mostrados no painel de debug (e expostos em `data-*` para os testes e2e). */
export type DebugInfo = Record<
  | 'fps'
  | 'tick'
  | 'seed'
  | 'map'
  | 'pos'
  | 'tile'
  | 'alive'
  | 'bombs'
  | 'range'
  | 'speed'
  | 'blocks',
  string
>;

/** Resumo legível do estado, a partir do jogador local (id 0). Só lê o mundo. */
export function debugInfo(world: World, ctx: DebugContext, playerId = 0): DebugInfo {
  const p = world.players[playerId];
  const active = world.bombs.filter((b) => b.ownerId === playerId).length;
  let blocks = 0;
  for (const id of world.grid.tiles) if (id === BLOCK) blocks++;

  return {
    fps: Math.round(ctx.fps).toString(),
    tick: world.tick.toString(),
    seed: ctx.seed.toString(),
    map: ctx.mapId,
    pos: p ? `${p.x.toFixed(2)}, ${p.y.toFixed(2)}` : '-',
    tile: p ? `${Math.round(p.x)},${Math.round(p.y)}` : '-',
    alive: p?.alive ? 'vivo' : 'morto',
    bombs: p ? `${active}/${p.maxBombs}` : '-',
    range: p ? p.range.toString() : '-',
    speed: p ? p.speedLevel.toString() : '-',
    blocks: blocks.toString(),
  };
}
