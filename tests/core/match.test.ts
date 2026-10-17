import { describe, expect, it } from 'vitest';
import type { Command } from '../../src/core/commands';
import type { MapDefinition } from '../../src/core/grid';
import { createMatch, stepMatch, type Match, type MatchRules } from '../../src/core/match';
import type { GameEvent } from '../../src/events';
import { testRules, testTerrains } from './helpers';

const matchRules: MatchRules = {
  winsToWin: 2,
  roundTicks: 100,
  countdownTicks: 5,
  roundEndDelayTicks: 4,
};

/** 4 spawns nos cantos; `densidade` > 0 para as rodadas terem grades diferentes. */
function arenaMap(densidade = 0): MapDefinition {
  return {
    tamanho: [7, 7],
    legenda: { '#': 'parede', '.': 'chao', P: 'spawn' },
    mapa: ['#######', '#P...P#', '#.....#', '#.....#', '#.....#', '#P...P#', '#######'],
    blocos: { densidade },
  };
}

function newMatch(
  opts: { players?: number; seed?: number; densidade?: number; rules?: Partial<MatchRules> } = {},
  out: GameEvent[] = [],
): Match {
  return createMatch(
    {
      map: arenaMap(opts.densidade),
      terrains: testTerrains,
      rules: testRules,
      matchRules: { ...matchRules, ...opts.rules },
      seed: opts.seed ?? 7,
      players: opts.players ?? 4,
    },
    out,
  );
}

/** Roda `ticks` ticks da partida; `first` entra no primeiro. */
function runMatch(match: Match, ticks: number, first: Command[] = []): GameEvent[] {
  const events: GameEvent[] = [];
  for (let i = 0; i < ticks; i++) stepMatch(match, i === 0 ? first : [], events);
  return events;
}

/** Pula a contagem da rodada atual. */
function skipCountdown(match: Match): GameEvent[] {
  return runMatch(match, match.phaseTicks);
}

/** Mata os jogadores indicados (os testes de rodada não dependem de como se morre). */
function kill(match: Match, ...ids: number[]): void {
  for (const id of ids) {
    const p = match.world.players[id];
    if (p) p.alive = false;
  }
}

const ofType = <T extends GameEvent['type']>(events: GameEvent[], type: T) =>
  events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);

describe('partida: início e contagem', () => {
  it('createMatch começa na contagem da rodada 1 e emite rodada.contagem', () => {
    const out: GameEvent[] = [];
    const match = newMatch({}, out);
    expect(match.phase).toBe('countdown');
    expect(match.round).toBe(1);
    expect(match.phaseTicks).toBe(5);
    expect(match.clockTicks).toBe(100);
    expect(match.wins).toEqual([0, 0, 0, 0]);
    expect(match.world.players).toHaveLength(4);
    expect(out).toEqual([{ type: 'rodada.contagem', round: 1 }]);
  });

  it('na contagem o mundo e o relógio não andam; ao fim emite rodada.iniciou', () => {
    const match = newMatch();
    const events = runMatch(match, 4, [{ type: 'bomb', playerId: 0 }]);
    expect(match.phase).toBe('countdown');
    expect(match.world.tick).toBe(0);
    expect(match.world.bombs).toHaveLength(0);
    expect(match.clockTicks).toBe(100);
    expect(events).toEqual([]);

    const go = runMatch(match, 1);
    expect(match.phase).toBe('playing');
    expect(go).toEqual([{ type: 'rodada.iniciou', round: 1 }]);
  });

  it('direção segurada na contagem vale no "Já!", sem novo comando', () => {
    const match = newMatch();
    runMatch(match, 2, [{ type: 'move', playerId: 0, dir: 'right' }]);
    const startX = match.world.players[0]?.x ?? 0;
    expect(match.world.players[0]?.moveDir).toBeNull();

    skipCountdown(match);
    runMatch(match, 5);
    expect(match.world.players[0]?.x).toBeGreaterThan(startX);
  });

  it('a 1ª rodada usa a própria seed da partida', () => {
    const match = newMatch({ seed: 7, densidade: 0.5 });
    const same = newMatch({ seed: 7, densidade: 0.5 });
    expect(match.world.grid.tiles).toEqual(same.world.grid.tiles);
    expect(match.world.rng.state).toBe(same.world.rng.state);
  });
});

describe('partida: fim de rodada', () => {
  it('sobrou 1 vivo → espera o atraso e dá a vitória a ele', () => {
    const match = newMatch();
    skipCountdown(match);
    kill(match, 1, 2, 3);

    const during = runMatch(match, 1);
    expect(match.phase).toBe('ending');
    expect(ofType(during, 'rodada.terminou')).toHaveLength(0);

    const end = runMatch(match, 4);
    expect(ofType(end, 'rodada.terminou')).toEqual([
      { type: 'rodada.terminou', round: 1, winnerId: 0, wins: [1, 0, 0, 0] },
    ]);
    expect(match.wins).toEqual([1, 0, 0, 0]);
  });

  it('a simulação roda durante a espera de fim (comandos aceitos)', () => {
    const match = newMatch();
    skipCountdown(match);
    kill(match, 1, 2, 3);
    runMatch(match, 1);
    const tick = match.world.tick;
    const x = match.world.players[0]?.x ?? 0;
    runMatch(match, 2, [{ type: 'move', playerId: 0, dir: 'right' }]);
    expect(match.world.tick).toBe(tick + 2);
    expect(match.world.players[0]?.x).toBeGreaterThan(x);
  });

  it('todos morrem no mesmo tick → empate', () => {
    const match = newMatch();
    skipCountdown(match);
    kill(match, 0, 1, 2, 3);
    const events = runMatch(match, 1 + 4);
    expect(ofType(events, 'rodada.terminou')).toEqual([
      { type: 'rodada.terminou', round: 1, winnerId: null, wins: [0, 0, 0, 0] },
    ]);
  });

  it('o último vivo morre durante a espera → empate', () => {
    const match = newMatch();
    skipCountdown(match);
    kill(match, 1, 2, 3);
    runMatch(match, 2);
    kill(match, 0);
    const events = runMatch(match, 3);
    expect(ofType(events, 'rodada.terminou')[0]?.winnerId).toBeNull();
  });

  it('relógio zera com 2+ vivos → empate na hora', () => {
    const match = newMatch();
    skipCountdown(match);
    const before = runMatch(match, 99);
    expect(ofType(before, 'rodada.terminou')).toHaveLength(0);
    expect(match.clockTicks).toBe(1);

    const end = runMatch(match, 1);
    expect(ofType(end, 'rodada.terminou')).toEqual([
      { type: 'rodada.terminou', round: 1, winnerId: null, wins: [0, 0, 0, 0] },
    ]);
  });

  it('relógio zera durante a espera de fim → vale a espera', () => {
    const match = newMatch();
    skipCountdown(match);
    runMatch(match, 98);
    kill(match, 1, 2, 3);
    const events = runMatch(match, 1 + 3);
    expect(match.phase).toBe('ending');
    expect(match.clockTicks).toBe(0);
    events.push(...runMatch(match, 1));
    const ends = ofType(events, 'rodada.terminou');
    expect(ends).toHaveLength(1);
    expect(ends[0]?.winnerId).toBe(0);
  });

  it('morte por explosão de verdade também encerra a rodada', () => {
    const match = newMatch({ players: 2 });
    skipCountdown(match);
    // O jogador 0 solta bomba no próprio spawn (canto, sem fugir) e o 1, longe da cruz, vence.
    runMatch(match, 1, [{ type: 'bomb', playerId: 0 }]);
    const events = runMatch(match, testRules.fuseTicks + 1 + 4);
    expect(ofType(events, 'jogador.morreu')).toEqual([{ type: 'jogador.morreu', playerId: 0 }]);
    expect(ofType(events, 'rodada.terminou')[0]?.winnerId).toBe(1);
  });
});

describe('partida: rodadas seguintes e fim da partida', () => {
  it('depois de uma rodada começa a próxima com grade nova, contagem e relógio cheio', () => {
    const out: GameEvent[] = [];
    const match = newMatch({ densidade: 0.5 }, out);
    const firstTiles = [...match.world.grid.tiles];
    skipCountdown(match);
    runMatch(match, 10, [{ type: 'bomb', playerId: 0 }]);
    kill(match, 1, 2, 3);
    const events = runMatch(match, 1 + 4);

    expect(ofType(events, 'rodada.contagem')).toEqual([{ type: 'rodada.contagem', round: 2 }]);
    expect(match.round).toBe(2);
    expect(match.phase).toBe('countdown');
    expect(match.clockTicks).toBe(100);
    expect(match.world.tick).toBe(0);
    expect(match.world.bombs).toHaveLength(0);
    expect(match.world.flames.every((f) => f === 0)).toBe(true);
    expect(match.world.players.every((p) => p.alive)).toBe(true);
    expect(match.world.grid.tiles).not.toEqual(firstTiles);
  });

  it('a rodada r usa a seed seed + (r − 1)', () => {
    const match = newMatch({ seed: 7, densidade: 0.5 });
    skipCountdown(match);
    kill(match, 1, 2, 3);
    runMatch(match, 1 + 4);
    const round2 = newMatch({ seed: 8, densidade: 0.5 });
    expect(match.world.grid.tiles).toEqual(round2.world.grid.tiles);
  });

  it('a direção segurada atravessa a troca de rodada', () => {
    const match = newMatch();
    skipCountdown(match);
    runMatch(match, 1, [{ type: 'move', playerId: 0, dir: 'down' }]);
    kill(match, 1, 2, 3);
    runMatch(match, 1 + 4);
    expect(match.round).toBe(2);
    const startY = match.world.players[0]?.y ?? 0;
    skipCountdown(match);
    runMatch(match, 5);
    expect(match.world.players[0]?.y).toBeGreaterThan(startY);
  });

  it('empates não contam; quem chega a 2 vitórias vence a partida', () => {
    const match = newMatch();
    const all: GameEvent[] = [];
    const playRound = (winner: number | null) => {
      all.push(...skipCountdown(match));
      kill(match, ...[0, 1, 2, 3].filter((id) => id !== winner));
      all.push(...runMatch(match, 1 + 4));
    };

    playRound(2);
    playRound(null);
    expect(match.wins).toEqual([0, 0, 1, 0]);
    expect(match.phase).toBe('countdown');
    expect(match.round).toBe(3);

    playRound(2);
    expect(match.phase).toBe('over');
    expect(match.winnerId).toBe(2);
    expect(ofType(all, 'partida.terminou')).toEqual([
      { type: 'partida.terminou', winnerId: 2, wins: [0, 0, 2, 0] },
    ]);
    expect(ofType(all, 'rodada.contagem').map((e) => e.round)).toEqual([2, 3]);
  });

  it('depois do fim da partida nada mais acontece', () => {
    const match = newMatch({ rules: { winsToWin: 1 } });
    skipCountdown(match);
    kill(match, 1, 2, 3);
    runMatch(match, 1 + 4);
    expect(match.phase).toBe('over');
    const tick = match.world.tick;
    const events = runMatch(match, 20, [
      { type: 'move', playerId: 0, dir: 'right' },
      { type: 'bomb', playerId: 0 },
    ]);
    expect(events).toEqual([]);
    expect(match.world.tick).toBe(tick);
  });

  it('o wins dos eventos é uma cópia (não muda depois)', () => {
    const match = newMatch();
    skipCountdown(match);
    kill(match, 1, 2, 3);
    const first = ofType(runMatch(match, 1 + 4), 'rodada.terminou')[0];
    skipCountdown(match);
    kill(match, 1, 2, 3);
    runMatch(match, 1 + 4);
    expect(first?.wins).toEqual([1, 0, 0, 0]);
  });
});
