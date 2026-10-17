import { describe, expect, it } from 'vitest';
import { tileAt } from '../../src/core/grid';
import type { World } from '../../src/core/world';
import type { GameEvent } from '../../src/events';
import { dropBomb, hold, player, run, worldFrom } from './helpers';

// fuseTicks 10, explosionTicks 3, 1 bomba, alcance 2, 0,1 tile/tick (helpers.ts).

function flameAt(world: World, x: number, y: number): boolean {
  return (world.flames[y * world.grid.cols + x] ?? 0) > 0;
}

function ofType<T extends GameEvent['type']>(events: GameEvent[], type: T) {
  return events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);
}

const OPEN = [
  '#########', //
  '#.......#',
  '#...P...#',
  '#.......#',
  '#########',
];

describe('soltar bomba', () => {
  it('coloca a bomba no tile do jogador e emite bomba.colocada', () => {
    const world = worldFrom(OPEN);
    const events = dropBomb(world);
    expect(world.bombs).toHaveLength(1);
    expect(world.bombs[0]).toMatchObject({ x: 4, y: 2, ownerId: 0, range: 2 });
    expect(ofType(events, 'bomba.colocada')).toEqual([
      { type: 'bomba.colocada', bombId: world.bombs[0]?.id, playerId: 0, x: 4, y: 2 },
    ]);
  });

  it('usa o tile mais próximo quando o jogador está entre dois', () => {
    const world = worldFrom(OPEN);
    hold(world, 'right', 6); // x = 4,6
    dropBomb(world);
    expect(world.bombs[0]).toMatchObject({ x: 5, y: 2 });
  });

  it('respeita o limite de bombas simultâneas', () => {
    const world = worldFrom(OPEN, 1, { fuseTicks: 30 });
    dropBomb(world);
    hold(world, 'right', 10);
    dropBomb(world);
    expect(world.bombs).toHaveLength(1);
  });

  it('não coloca duas bombas no mesmo tile', () => {
    const world = worldFrom(OPEN, 1, { startBombs: 3 });
    dropBomb(world);
    dropBomb(world);
    expect(world.bombs).toHaveLength(1);
  });

  it('não coloca bomba em terreno que não aceita (água rasa)', () => {
    const world = worldFrom(['#####', '#wP.#', '#####']);
    hold(world, 'left', 10);
    expect(dropBomb(world)).toEqual([]);
    expect(world.bombs).toHaveLength(0);
  });

  it('libera a bomba depois da explosão', () => {
    const world = worldFrom(OPEN, 1, { fuseTicks: 30 });
    dropBomb(world); // (4,2)
    hold(world, 'up', 10); // (4,1)
    hold(world, 'right', 10); // (5,1): fora da cruz
    run(world, 15); // explode no tick 30, chamas somem no 33
    dropBomb(world);
    expect(player(world).alive).toBe(true);
    expect(world.bombs).toHaveLength(1);
  });
});

describe('explosão', () => {
  it('explode exatamente após o pavio', () => {
    const world = worldFrom(OPEN);
    dropBomb(world); // tick 1: pavio passa a 9
    expect(ofType(run(world, 8), 'bomba.explodiu')).toHaveLength(0);
    expect(ofType(run(world, 1), 'bomba.explodiu')).toHaveLength(1);
    expect(world.bombs).toHaveLength(0);
  });

  it('chamas em cruz até o alcance, parando antes da parede', () => {
    const world = worldFrom(OPEN);
    dropBomb(world);
    const [boom] = ofType(run(world, 9), 'bomba.explodiu');
    const tiles = boom?.tiles.map((t) => `${t.x},${t.y}`).sort();
    // y = 2: x de 2 a 6; x = 4: y de 1 a 3 (paredes em y = 0 e y = 4).
    expect(tiles).toEqual(['2,2', '3,2', '4,1', '4,2', '4,3', '5,2', '6,2'].sort());
    expect(flameAt(world, 4, 0)).toBe(false);
  });

  it('destrói só o primeiro bloco da linha', () => {
    const world = worldFrom(['#######', '#PBB..#', '#######'], 1, { startRange: 3 });
    dropBomb(world);
    run(world, 9);
    expect(flameAt(world, 2, 1)).toBe(true);
    expect(flameAt(world, 3, 1)).toBe(false);
  });

  it('bloco atingido continua bloqueando enquanto queima e vira chão depois', () => {
    const world = worldFrom(['######', '#PB..#', '######']);
    dropBomb(world);
    run(world, 9);
    expect(tileAt(world.grid, 2, 1)).toBe('bloco');
    const events = run(world, 3);
    expect(tileAt(world.grid, 2, 1)).toBe('chao');
    expect(ofType(events, 'bloco.destruido')).toEqual([{ type: 'bloco.destruido', x: 2, y: 1 }]);
  });

  it('as chamas duram explosionTicks', () => {
    const world = worldFrom(OPEN);
    dropBomb(world);
    run(world, 9); // explode
    run(world, 2);
    expect(flameAt(world, 4, 2)).toBe(true);
    run(world, 1);
    expect(flameAt(world, 4, 2)).toBe(false);
  });

  it('reação em cadeia: bomba atingida explode no mesmo tick', () => {
    const world = worldFrom(OPEN, 1, { startBombs: 2, fuseTicks: 40 });
    dropBomb(world); // A em (4,2): explode no tick 40
    hold(world, 'right', 10); // (5,2)
    dropBomb(world); // B em (5,2): sozinha explodiria no tick 51
    hold(world, 'up', 10); // (5,1)
    hold(world, 'right', 10); // (6,1): fora das duas cruzes
    const events: GameEvent[] = [];
    let explodedAt: number[] = [];
    for (let i = 0; i < 10; i++) {
      const tickEvents = run(world, 1);
      events.push(...tickEvents);
      if (ofType(tickEvents, 'bomba.explodiu').length > 0) explodedAt = [...explodedAt, world.tick];
    }
    expect(ofType(events, 'bomba.explodiu')).toHaveLength(2);
    expect(explodedAt).toEqual([40]); // as duas no mesmo tick
    expect(world.bombs).toHaveLength(0);
    expect(player(world).alive).toBe(true);
  });

  it('o fogo para numa bomba (e ela explode em seguida)', () => {
    const world = worldFrom(['#########', '#P......#', '#########'], 1, {
      startBombs: 2,
      startRange: 5,
      fuseTicks: 40,
    });
    const [placedA] = ofType(dropBomb(world), 'bomba.colocada'); // A em (1,1)
    hold(world, 'right', 20); // (3,1)
    dropBomb(world); // B em (3,1)
    const events = hold(world, null, 30);
    const booms = ofType(events, 'bomba.explodiu');
    const boomA = booms.find((e) => e.bombId === placedA?.bombId);
    expect(boomA?.tiles.map((t) => t.x).sort()).toEqual([1, 2, 3]);
    expect(booms).toHaveLength(2);
  });
});

describe('bombas e movimento', () => {
  it('o jogador consegue sair da própria bomba', () => {
    const world = worldFrom(OPEN);
    dropBomb(world);
    hold(world, 'right', 5);
    expect(player(world).x).toBeCloseTo(4.5);
  });

  it('não consegue voltar para a bomba depois de sair do tile', () => {
    const world = worldFrom(OPEN, 1, { fuseTicks: 30 });
    dropBomb(world);
    hold(world, 'right', 8); // x = 4,8 (já no tile 5)
    hold(world, 'left', 8);
    expect(player(world).x).toBeCloseTo(4.8);
  });
});

describe('morte', () => {
  it('jogador na chama morre e emite jogador.morreu', () => {
    const world = worldFrom(OPEN);
    dropBomb(world);
    const events = run(world, 9);
    expect(player(world).alive).toBe(false);
    expect(ofType(events, 'jogador.morreu')).toEqual([{ type: 'jogador.morreu', playerId: 0 }]);
  });

  it('jogador fora da cruz sobrevive', () => {
    const world = worldFrom(OPEN, 1, { fuseTicks: 30 });
    dropBomb(world);
    hold(world, 'right', 10); // (5,2)
    hold(world, 'up', 10); // (5,1), fora da cruz
    run(world, 15);
    expect(player(world).alive).toBe(true);
  });

  it('jogador morto ignora comandos', () => {
    const world = worldFrom(OPEN);
    dropBomb(world);
    run(world, 9);
    const { x } = player(world);
    hold(world, 'right', 10);
    dropBomb(world);
    expect(player(world).x).toBe(x);
    expect(world.bombs).toHaveLength(0);
  });
});
