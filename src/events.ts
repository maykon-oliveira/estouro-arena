// Tipos de todos os eventos emitidos pela simulação (src/core).
// Render, áudio e rede apenas escutam; nunca alteram o estado.
import type { Direction } from './core/direction';
import type { Point } from './core/grid';

export type GameEvent =
  | { type: 'bomba.colocada'; bombId: number; playerId: number; x: number; y: number }
  | { type: 'bomba.explodiu'; bombId: number; x: number; y: number; tiles: Point[] }
  /** Emitido quando o bloco termina de queimar e vira chão. */
  | { type: 'bloco.destruido'; x: number; y: number }
  | { type: 'jogador.morreu'; playerId: number }
  | { type: 'bomba.chutada'; bombId: number; playerId: number; dir: Direction }
  /** Bomba chutada parou no centro de um tile. */
  | { type: 'bomba.parou'; bombId: number; x: number; y: number }
  /** Bloco com item virou chão: o item aparece no tile. */
  | { type: 'item.revelado'; itemId: string; x: number; y: number }
  | { type: 'item.pego'; playerId: number; itemId: string; x: number; y: number }
  /** Explosão atingiu um item visível. */
  | { type: 'item.destruido'; itemId: string; x: number; y: number }
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
  'bomba.chutada',
  'bomba.parou',
  'item.revelado',
  'item.pego',
  'item.destruido',
  'rodada.contagem',
  'rodada.iniciou',
  'rodada.terminou',
  'partida.terminou',
] as const satisfies readonly GameEventType[];
