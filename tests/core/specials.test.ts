import { describe, expect, it } from 'vitest';
import { createBot, updateBot, type BotConfig } from '../../src/core/bots/bot';
import type { Command } from '../../src/core/commands';
import { step, type World } from '../../src/core/world';
import type { GameEvent } from '../../src/events';
import { dropBomb, hold, player, run, testRules, worldFrom } from './helpers';

const idx = (world: World, x: number, y: number) => y * world.grid.cols + x;

const ofType = <T extends GameEvent['type']>(events: GameEvent[], type: T) =>
  events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);

const fill = (world: World, playerId = 0) => {
  const p = player(world, playerId);
  p.energy = testRules.energyMax;
};

const special = (world: World, playerId = 0) => run(world, 1, [{ type: 'special', playerId }]);

/** Vira o jogador para a direção sem sair do centro do tile (encosta numa parede antes). */
function face(world: World, dir: 'up' | 'down' | 'left' | 'right', playerId = 0): void {
  const p = player(world, playerId);
  p.facing = dir;
}

describe('usar o especial', () => {
  it('sem a barra cheia, nada acontece', () => {
    const world = worldFrom(['#######', '#P....#', '#######'], 1, {}, undefined, ['saci']);
    face(world, 'right');
    player(world).energy = testRules.energyMax - 1;
    expect(ofType(special(world), 'especial.usado')).toHaveLength(0);
    expect(player(world).x).toBe(1);
  });

  it('sem personagem (ou sem especial), nada acontece', () => {
    const world = worldFrom(['#######', '#P....#', '#######']);
    fill(world);
    expect(ofType(special(world), 'especial.usado')).toHaveLength(0);
    expect(player(world).energy).toBe(testRules.energyMax);
  });
});

describe('Saci: Redemoinho', () => {
  it('reaparece 3 tiles à frente, por cima de bloco e parede, e gasta a barra', () => {
    const world = worldFrom(['#######', '#P#B..#', '#######'], 1, {}, undefined, ['saci']);
    face(world, 'right');
    fill(world);
    const events = special(world);
    expect(ofType(events, 'especial.usado')).toEqual([
      { type: 'especial.usado', playerId: 0, characterId: 'saci', special: 'teleport' },
    ]);
    expect(player(world)).toMatchObject({ x: 4, y: 1, energy: 0 });
  });

  it('pouso ruim a 3: tenta 2, depois 1', () => {
    const world = worldFrom(['#######', '#P..#.#', '#######'], 1, {}, undefined, ['saci']);
    face(world, 'right');
    fill(world);
    special(world);
    expect(player(world).x).toBe(3);

    const bombed = worldFrom(['#######', '#P...##', '#######'], 1, {}, undefined, ['saci']);
    bombed.bombs.push({ id: 8, ownerId: 0, x: 4, y: 1, fuse: 99, range: 1 });
    bombed.bombs.push({ id: 9, ownerId: 0, x: 3, y: 1, fuse: 99, range: 1 });
    face(bombed, 'right');
    fill(bombed);
    special(bombed);
    expect(player(bombed).x).toBe(2);
  });

  it('sem pouso válido, falha e a barra fica cheia', () => {
    const world = worldFrom(['#####', '#P###', '#####'], 1, {}, undefined, ['saci']);
    face(world, 'right');
    fill(world);
    expect(ofType(special(world), 'especial.usado')).toHaveLength(0);
    expect(player(world)).toMatchObject({ x: 1, energy: testRules.energyMax });
  });
});

describe('Boto: Encanto', () => {
  const MAP = ['#########', '#P.....P#', '#P......#', '#########'];

  it('inverte os controles do rival mais próximo por um tempo', () => {
    const world = worldFrom(MAP, 3, {}, undefined, ['boto', null, null]);
    fill(world);
    special(world);
    // O jogador 2 (em (1, 2)) é o mais próximo do Boto em (1, 1); o 1º tick já conta.
    expect(player(world, 2).charmTicks).toBe(5);
    expect(player(world, 1).charmTicks).toBe(0);
    hold(world, 'right', 3, 2); // vai para a esquerda… mas há parede: fica parado
    expect(player(world, 2).x).toBe(1);
    expect(player(world, 2).moveDir).toBe('left');
    run(world, 3);
    // Acabou o encanto: a direção segurada volta ao normal.
    expect(player(world, 2).charmTicks).toBe(0);
    expect(player(world, 2).moveDir).toBe('right');
  });

  it('inverte na hora a direção que já estava segurada', () => {
    const world = worldFrom(MAP, 3, {}, undefined, ['boto', null, null]);
    run(world, 1, [{ type: 'move', playerId: 2, dir: 'right' }]);
    fill(world);
    special(world);
    expect(player(world, 2).moveDir).toBe('left');
  });

  it('sem rival vivo, falha', () => {
    const world = worldFrom(MAP, 2, {}, undefined, ['boto', null]);
    player(world, 1).alive = false;
    fill(world);
    expect(ofType(special(world), 'especial.usado')).toHaveLength(0);
  });
});

describe('Mula sem Cabeça: Disparada', () => {
  it('corre até 4 tiles, quebra os blocos do caminho na hora e revela item', () => {
    const world = worldFrom(['########', '#PB.B..#', '########'], 1, {}, undefined, [
      'mula_sem_cabeca',
    ]);
    world.hiddenItems[idx(world, 4, 1)] = 'fogo';
    face(world, 'right');
    fill(world);
    const events = special(world);
    expect(ofType(events, 'bloco.destruido')).toHaveLength(2);
    expect(ofType(events, 'item.revelado')).toEqual([
      { type: 'item.revelado', itemId: 'fogo', x: 4, y: 1 },
    ]);
    expect(player(world).dash).not.toBeNull();
    run(world, 4 * 2);
    expect(player(world)).toMatchObject({ x: 5, y: 1, dash: null });
    // Pegou o item revelado no caminho.
    expect(player(world).range).toBe(testRules.startRange + 1);
  });

  it('para antes de parede e de bomba; não solta bomba correndo', () => {
    const world = worldFrom(['#######', '#P..#.#', '#######'], 1, {}, undefined, [
      'mula_sem_cabeca',
    ]);
    face(world, 'right');
    fill(world);
    special(world);
    expect(ofType(dropBomb(world), 'bomba.colocada')).toHaveLength(0);
    run(world, 10);
    expect(player(world).x).toBe(3);

    const bombed = worldFrom(['#######', '#P....#', '#######'], 1, {}, undefined, [
      'mula_sem_cabeca',
    ]);
    bombed.bombs.push({ id: 9, ownerId: 0, x: 3, y: 1, fuse: 99, range: 1 });
    face(bombed, 'right');
    fill(bombed);
    special(bombed);
    run(bombed, 10);
    expect(player(bombed).x).toBe(2);
  });

  it('parede logo à frente: falha e a barra fica cheia', () => {
    const world = worldFrom(['#####', '#P#.#', '#####'], 1, {}, undefined, ['mula_sem_cabeca']);
    face(world, 'right');
    fill(world);
    expect(ofType(special(world), 'especial.usado')).toHaveLength(0);
    expect(player(world).energy).toBe(testRules.energyMax);
  });
});

describe('bots e especiais', () => {
  const sharp: BotConfig = {
    level: { reactionTicks: 1, mistakeChance: 0, aggression: 0, itemSearchTiles: 15 },
    escapeMarginTicks: 0,
  };

  /** Uma decisão do bot (sem simular): devolve os comandos dele. */
  function decide(world: World, playerId = 0): Command[] {
    const cmds: Command[] = [];
    updateBot(createBot(playerId, sharp, 1), world, cmds);
    return cmds;
  }

  it('Saci encurralado pela própria bomba teleporta para fora do perigo', () => {
    const world = worldFrom(['#######', '#P#...#', '#######'], 1, {}, undefined, ['saci']);
    world.bombs.push({ id: 9, ownerId: 0, x: 1, y: 1, fuse: 20, range: 3 });
    face(world, 'right');
    fill(world);
    expect(decide(world).map((c) => c.type)).toContain('special');
    const cmds = decide(world);
    step(world, cmds);
    // Pouso a 3 (4, 1) cai na cruz da bomba? Não: a parede em (2, 1) barra o fogo.
    expect(player(world).x).toBe(4);
  });

  it('Boto encanta o rival a até 4 tiles; longe, não', () => {
    const near = worldFrom(['#######', '#P..P.#', '#######'], 2, {}, undefined, ['boto', null]);
    fill(near);
    expect(decide(near).map((c) => c.type)).toContain('special');

    const far = worldFrom(['#########', '#P.....P#', '#########'], 2, {}, undefined, [
      'boto',
      null,
    ]);
    fill(far);
    expect(decide(far).map((c) => c.type)).not.toContain('special');
  });

  it('Mula dispara quando há bloco no caminho à frente e o percurso é seguro', () => {
    const world = worldFrom(['#######', '#P.B..#', '#######'], 1, {}, undefined, [
      'mula_sem_cabeca',
    ]);
    face(world, 'right');
    fill(world);
    expect(decide(world).map((c) => c.type)).toContain('special');

    const open = worldFrom(['#######', '#P....#', '#######'], 1, {}, undefined, [
      'mula_sem_cabeca',
    ]);
    face(open, 'right');
    fill(open);
    expect(decide(open).map((c) => c.type)).not.toContain('special');
  });
});
