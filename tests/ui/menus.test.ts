import { describe, expect, it } from 'vitest';
import type { Player } from '../../src/core/world';
import { panelChips, resultTitle } from '../../src/ui/playerPanel';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  readUrlOptions,
  saveSettings,
  type SettingsStore,
} from '../../src/ui/settings';

const valid = {
  maps: new Set(['arena_01', 'pantanal_01', 'tundra_01']),
  levels: new Set(['facil', 'medio', 'dificil']),
};

function memoryStore(initial: Record<string, string> = {}): SettingsStore & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

describe('configurações da batalha', () => {
  it('sem armazenamento, usa os padrões', () => {
    expect(loadSettings(null, valid)).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS).toEqual({ mapId: 'arena_01', bots: 3, level: 'medio' });
  });

  it('salva e carrega a última escolha', () => {
    const store = memoryStore();
    saveSettings(store, { mapId: 'tundra_01', bots: 1, level: 'dificil' });
    expect(loadSettings(store, valid)).toEqual({ mapId: 'tundra_01', bots: 1, level: 'dificil' });
  });

  it('valores inválidos caem no padrão, campo a campo', () => {
    const store = memoryStore({
      'estouro.batalha': JSON.stringify({ mapId: 'lua_99', bots: 7, level: 'dificil' }),
    });
    expect(loadSettings(store, valid)).toEqual({ mapId: 'arena_01', bots: 3, level: 'dificil' });
    expect(loadSettings(memoryStore({ 'estouro.batalha': '{oops' }), valid)).toEqual(
      DEFAULT_SETTINGS,
    );
  });

  it('armazenamento que falha não quebra nada', () => {
    const broken: SettingsStore = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
    };
    expect(loadSettings(broken, valid)).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(broken, DEFAULT_SETTINGS)).not.toThrow();
  });
});

describe('atalhos de URL', () => {
  it('sem parâmetros de jogo, abre no menu', () => {
    expect(readUrlOptions('', DEFAULT_SETTINGS, valid).autostart).toBe(false);
    expect(readUrlOptions('?touch=1', DEFAULT_SETTINGS, valid).autostart).toBe(false);
  });

  it('com parâmetros, começa direto e aplica o que for válido', () => {
    const o = readUrlOptions(
      '?map=pantanal_01&bots=2&nivel=facil&seed=7&ia=0&roundMs=32000&winsToWin=1',
      DEFAULT_SETTINGS,
      valid,
    );
    expect(o).toEqual({
      autostart: true,
      settings: { mapId: 'pantanal_01', bots: 2, level: 'facil' },
      seed: 7,
      botsEnabled: false,
      roundMs: 32000,
      winsToWin: 1,
    });
  });

  it('valores inválidos são ignorados', () => {
    const o = readUrlOptions('?map=x&bots=9&nivel=y&seed=z&roundMs=5', DEFAULT_SETTINGS, valid);
    expect(o.autostart).toBe(true);
    expect(o.settings).toEqual(DEFAULT_SETTINGS);
    expect(o.seed).toBeNull();
    expect(o.roundMs).toBeNull();
    expect(o.botsEnabled).toBe(true);
  });
});

function fakePlayer(over: Partial<Player> = {}): Player {
  return {
    id: 0,
    x: 1,
    y: 1,
    facing: 'down',
    moveDir: null,
    iceSlide: null,
    alive: true,
    maxBombs: 1,
    range: 2,
    speedLevel: 0,
    abilities: new Set(),
    mount: null,
    invulnerableTicks: 0,
    jump: null,
    abilityCooldown: 0,
    deathTick: null,
    ghost: null,
    ...over,
  };
}

describe('painel do jogador', () => {
  it('mostra bombas e alcance; patins, habilidades e montaria só se tiver', () => {
    expect(panelChips(fakePlayer())).toEqual(['💣 1', '🔥 2']);
    expect(
      panelChips(
        fakePlayer({
          maxBombs: 3,
          range: 5,
          speedLevel: 2,
          abilities: new Set(['chute', 'remota']),
          mount: 'capivara',
        }),
      ),
    ).toEqual(['💣 3', '🔥 5', '👟 2', 'Chute', 'Remota', 'Capivara']);
  });

  it('morto: fora da rodada, ou o estado do arremesso do fantasma', () => {
    expect(panelChips(fakePlayer({ alive: false }))).toEqual(['Fora da rodada']);
    const ghost = { s: 1, moveDir: null, travelDir: null, travelSign: 0, flight: null };
    expect(panelChips(fakePlayer({ alive: false, ghost: { ...ghost, thrown: false } }))).toEqual([
      'Fantasma: arremesso pronto',
    ]);
    expect(panelChips(fakePlayer({ alive: false, ghost: { ...ghost, thrown: true } }))).toEqual([
      'Fantasma: arremesso usado',
    ]);
  });
});

describe('resultado', () => {
  it('"Você venceu!" para o jogador local; cor para os outros', () => {
    expect(resultTitle(0)).toBe('Você venceu!');
    expect(resultTitle(2)).toBe('Verde venceu!');
  });
});
