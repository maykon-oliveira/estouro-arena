// Tipos de todos os eventos emitidos pela simulação (src/core).
// Render, áudio e rede apenas escutam; nunca alteram o estado.
import type { Point } from './core/grid';

export type GameEvent =
  | { type: 'bomba.colocada'; bombId: number; playerId: number; x: number; y: number }
  | { type: 'bomba.explodiu'; bombId: number; x: number; y: number; tiles: Point[] }
  /** Emitido quando o bloco termina de queimar e vira chão. */
  | { type: 'bloco.destruido'; x: number; y: number }
  | { type: 'jogador.morreu'; playerId: number };

export type GameEventType = GameEvent['type'];

/** Lista dos tipos, para validar dados que referenciam eventos (ex.: sounds.json). */
export const GAME_EVENT_TYPES = [
  'bomba.colocada',
  'bomba.explodiu',
  'bloco.destruido',
  'jogador.morreu',
] as const satisfies readonly GameEventType[];
