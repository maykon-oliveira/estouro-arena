// Tipos de todos os eventos emitidos pela simulação (src/core).
// Render, áudio e rede apenas escutam; nunca alteram o estado.
import type { Point } from './core/grid';

export type GameEvent =
  | { type: 'bomba.colocada'; bombId: number; playerId: number; x: number; y: number }
  | { type: 'bomba.explodiu'; bombId: number; x: number; y: number; tiles: Point[] }
  /** Emitido quando o bloco termina de queimar e vira chão. */
  | { type: 'bloco.destruido'; x: number; y: number }
  | { type: 'jogador.morreu'; playerId: number }
  /** Começa a contagem antes da rodada (grade nova, jogadores no spawn). */
  | { type: 'rodada.contagem'; round: number }
  /** Fim da contagem: o relógio começa a correr. */
  | { type: 'rodada.iniciou'; round: number }
  /** `winnerId` null = empate. `wins` é uma cópia do placar depois da rodada. */
  | { type: 'rodada.terminou'; round: number; winnerId: number | null; wins: number[] }
  | { type: 'partida.terminou'; winnerId: number; wins: number[] };

export type GameEventType = GameEvent['type'];

/** Lista dos tipos, para validar dados que referenciam eventos (ex.: sounds.json). */
export const GAME_EVENT_TYPES = [
  'bomba.colocada',
  'bomba.explodiu',
  'bloco.destruido',
  'jogador.morreu',
  'rodada.contagem',
  'rodada.iniciou',
  'rodada.terminou',
  'partida.terminou',
] as const satisfies readonly GameEventType[];
