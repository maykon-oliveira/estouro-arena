import { describe, expect, it } from 'vitest';
import { buttonsView } from '../../src/ui/controlsModel';
import { player, run, testRules, worldFrom } from '../core/helpers';

const ROOM = ['#######', '#P....#', '#######'];

describe('botões pequenos', () => {
  it('sem remota, montaria ou especial, todos escondidos', () => {
    const view = buttonsView(worldFrom(ROOM), 0);
    expect(view.states).toEqual({ remote: 'hidden', mount: 'hidden', special: 'hidden' });
  });

  it('remota: aparece com a habilidade; acende com remota no mapa', () => {
    const world = worldFrom(ROOM);
    run(world, 1, [{ type: 'debugItem', playerId: 0, itemId: 'remota' }]);
    expect(buttonsView(world, 0).states.remote).toBe('dim');
    run(world, 1, [{ type: 'bomb', playerId: 0 }]);
    expect(buttonsView(world, 0).states.remote).toBe('ready');
  });

  it('montaria: só com habilidade (sapo); esmaece na recarga', () => {
    const world = worldFrom(ROOM);
    run(world, 1, [{ type: 'debugItem', playerId: 0, itemId: 'ovo_capivara' }]);
    expect(buttonsView(world, 0).states.mount).toBe('hidden');

    const frog = worldFrom(ROOM);
    run(frog, 1, [{ type: 'debugItem', playerId: 0, itemId: 'ovo_sapo_saltador' }]);
    expect(buttonsView(frog, 0).states.mount).toBe('ready');
    player(frog).facing = 'right';
    run(frog, 1, [{ type: 'mount', playerId: 0 }]);
    expect(buttonsView(frog, 0).states.mount).toBe('dim');
  });

  it('especial: aparece com personagem; o anel acompanha a barra; acende cheia', () => {
    const world = worldFrom(ROOM, 1, {}, undefined, ['saci']);
    player(world).energy = testRules.energyMax / 2;
    expect(buttonsView(world, 0)).toEqual({
      states: { remote: 'hidden', mount: 'hidden', special: 'dim' },
      specialFill: 0.5,
    });
    player(world).energy = testRules.energyMax;
    expect(buttonsView(world, 0).states.special).toBe('ready');
  });

  it('morto: todos escondidos', () => {
    const world = worldFrom(ROOM, 1, {}, undefined, ['saci']);
    player(world).alive = false;
    expect(buttonsView(world, 0).states).toEqual({
      remote: 'hidden',
      mount: 'hidden',
      special: 'hidden',
    });
  });
});
