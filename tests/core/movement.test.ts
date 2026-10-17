import { describe, expect, it } from 'vitest';
import type { Command } from '../../src/core/commands';
import type { Direction } from '../../src/core/direction';
import { step, type World } from '../../src/core/world';
import { worldFrom } from './helpers';

// Mapa clássico pequeno: pilares nas posições pares.
const ARENA = [
  '#########', //
  '#P......#',
  '#.#.#.#.#',
  '#.......#',
  '#########',
];

function hold(world: World, dir: Direction | null, ticks: number): void {
  const cmd: Command = { type: 'move', playerId: 0, dir };
  step(world, [cmd]);
  for (let i = 1; i < ticks; i++) step(world, []);
}

function player(world: World) {
  const p = world.players[0];
  if (!p) throw new Error('sem jogador');
  return p;
}

describe('createWorld', () => {
  it('coloca os jogadores nos spawns', () => {
    const world = worldFrom(['#####', '#P.P#', '#####'], 2);
    expect(world.players.map((p) => [p.x, p.y])).toEqual([
      [1, 1],
      [3, 1],
    ]);
    expect(world.tick).toBe(0);
  });

  it('recusa mais jogadores que spawns', () => {
    expect(() => worldFrom(['###', '#P#', '###'], 2)).toThrow();
  });
});

describe('movimento', () => {
  it('anda em linha reta na velocidade configurada', () => {
    const world = worldFrom(ARENA);
    hold(world, 'right', 10); // 0,1 tile/tick
    expect(player(world).x).toBeCloseTo(2);
    expect(player(world).y).toBe(1);
    expect(world.tick).toBe(10);
  });

  it('a direção segurada continua valendo entre ticks sem comando', () => {
    const world = worldFrom(ARENA);
    hold(world, 'right', 1);
    step(world, []);
    expect(player(world).x).toBeCloseTo(1.2);
  });

  it('para ao receber direção nula', () => {
    const world = worldFrom(ARENA);
    hold(world, 'right', 5);
    hold(world, null, 5);
    expect(player(world).x).toBeCloseTo(1.5);
  });

  it('para no centro do tile antes de uma parede', () => {
    const world = worldFrom(ARENA);
    hold(world, 'right', 200);
    expect(player(world).x).toBe(7);
    hold(world, 'left', 200);
    expect(player(world).x).toBe(1);
  });

  it('não entra num pilar', () => {
    const world = worldFrom(ARENA);
    hold(world, 'right', 10); // x = 2, acima do pilar (2,2)
    hold(world, 'down', 30);
    expect(player(world).y).toBe(1);
  });

  it('atualiza a direção do olhar mesmo bloqueado', () => {
    const world = worldFrom(ARENA);
    hold(world, 'up', 1);
    expect(player(world).facing).toBe('up');
    expect(player(world).y).toBe(1);
  });

  it('desacelera em terreno com multiplicador', () => {
    const world = worldFrom(['#######', '#P~~~~#', '#######']);
    hold(world, 'right', 5); // 0,5 tile no chão
    hold(world, 'right', 10); // agora na lama (tile 2 a partir de x = 1,5): 0,05/tick
    expect(player(world).x).toBeCloseTo(2);
  });
});

describe('assistência de curva', () => {
  // Coluna 1 livre de cima a baixo; coluna 2 só tem chão na linha 1 e na linha 3.
  const CORNER = [
    '#####', //
    '#P..#',
    '#.###',
    '#...#',
    '#####',
  ];

  it('desliza para a linha mais próxima e depois vira', () => {
    const world = worldFrom(CORNER);
    hold(world, 'down', 3); // y = 1,3
    hold(world, 'right', 3); // 3 ticks de deslize até y = 1
    expect(player(world).y).toBe(1);
    expect(player(world).x).toBe(1);
    hold(world, 'right', 5);
    expect(player(world).x).toBeCloseTo(1.5);
  });

  it('usa a sobra do tick para avançar depois de alinhar', () => {
    const world = worldFrom(CORNER);
    hold(world, 'down', 3);
    player(world).y = 1.05; // 0,05 de deslize, sobra 0,05 de avanço
    hold(world, 'right', 1);
    expect(player(world).y).toBe(1);
    expect(player(world).x).toBeCloseTo(1.05);
  });

  it('escolhe a linha vizinha livre quando a mais próxima está bloqueada', () => {
    const world = worldFrom(CORNER);
    hold(world, 'down', 16); // y = 2,6: linha 2 bloqueada à direita, linha 3 livre a 0,4
    hold(world, 'right', 4);
    expect(player(world).y).toBe(3);
  });

  it('não desliza além do limite de assistência', () => {
    const world = worldFrom(CORNER);
    hold(world, 'down', 14); // y = 2,4: linha 3 a 0,6 (fora), linha 2 bloqueada
    hold(world, 'right', 10);
    expect(player(world).y).toBeCloseTo(2.4);
    expect(player(world).x).toBe(1);
  });
});

describe('determinismo', () => {
  it('a mesma sequência de comandos produz o mesmo estado', () => {
    const run = () => {
      const world = worldFrom(ARENA);
      hold(world, 'right', 13);
      hold(world, 'down', 7);
      hold(world, 'left', 4);
      hold(world, 'down', 20);
      return world.players;
    };
    expect(run()).toEqual(run());
  });
});
