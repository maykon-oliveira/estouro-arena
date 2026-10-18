// Tipos de todos os eventos emitidos pela simulação (src/core).
// Render, áudio e rede apenas escutam; nunca alteram o estado.
import type { Direction } from './core/direction';
import type { Point } from './core/grid';

export type GameEvent =
  | { type: 'bomba.colocada'; bombId: number; playerId: number; x: number; y: number }
  | { type: 'bomba.explodiu'; bombId: number; x: number; y: number; tiles: Point[] }
  /** Emitido quando o bloco termina de queimar e vira chão. */
  | { type: 'bloco.destruido'; x: number; y: number }
  /** `cause`: chama (`fogo`) ou tile da morte súbita caindo em cima (`esmagado`). */
  | { type: 'jogador.morreu'; playerId: number; cause: 'fogo' | 'esmagado' }
  /** Quem morreu virou fantasma no anel da borda. */
  | { type: 'fantasma.surgiu'; playerId: number; x: number; y: number }
  /** O fantasma arremessou sua bomba (pousa em `to` depois do voo). */
  | { type: 'fantasma.arremessou'; playerId: number; from: Point; to: Point }
  /** Começou a morte súbita: tiles caem em espiral até o relógio zerar. */
  | { type: 'morte_subita.iniciou'; round: number }
  | { type: 'morte_subita.bloco_caiu'; x: number; y: number }
  | { type: 'bomba.chutada'; bombId: number; playerId: number; dir: Direction }
  /** Bomba chutada parou no centro de um tile. */
  | { type: 'bomba.parou'; bombId: number; x: number; y: number }
  | { type: 'montaria.montou'; playerId: number; mountId: string }
  /** O escudo da montaria absorveu uma chama. */
  | { type: 'montaria.perdida'; playerId: number; mountId: string }
  /** Habilidade da montaria usada (pulo do sapo). */
  | { type: 'montaria.acao'; playerId: number; mountId: string; from: Point; to: Point }
  /** A barra de energia chegou ao máximo (o especial está pronto). */
  | { type: 'energia.cheia'; playerId: number }
  /** Especial do personagem usado (gastou a barra). */
  | { type: 'especial.usado'; playerId: number; characterId: string; special: string }
  /** Especial com duração acabou. */
  | { type: 'especial.terminou'; playerId: number; characterId: string; special: string }
  /** O escudo do personagem (passiva da Mula sem Cabeça) absorveu uma chama. */
  | { type: 'personagem.escudo'; playerId: number; characterId: string }
  /** Terreno destrutível que não barra fogo (mato) terminou de queimar e virou chão. */
  | { type: 'terreno.queimou'; x: number; y: number; terrainId: string }
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
  'fantasma.surgiu',
  'fantasma.arremessou',
  'morte_subita.iniciou',
  'morte_subita.bloco_caiu',
  'montaria.montou',
  'montaria.perdida',
  'montaria.acao',
  'personagem.escudo',
  'energia.cheia',
  'especial.usado',
  'especial.terminou',
  'terreno.queimou',
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
