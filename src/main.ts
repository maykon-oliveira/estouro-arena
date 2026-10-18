import Phaser from 'phaser';
import { botConfigs, characters, gameConfig, items, maps, t } from './data';
import { KeyboardInput } from './input/KeyboardInput';
import { PlayerInput } from './input/PlayerInput';
import { TouchControls } from './input/TouchControls';
import { ArenaScene, type ArenaStart } from './render/ArenaScene';
import { DebugPanel, isDebugEnabled } from './ui/DebugPanel';
import { Screens } from './ui/Screens';
import { loadSettings, readUrlOptions, saveSettings } from './ui/settings';

const LOCAL_PLAYER = 0;

function byId(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} não encontrado no index.html`);
  return el;
}

/** `localStorage` pode não existir ou lançar (aba privada, bloqueado): aí não salvamos nada. */
function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const randomSeed = (): number => Math.floor(Math.random() * 2 ** 32);

byId('rotate-warning').textContent = t('rotate_warning');

const touch = new TouchControls(byId('controls'));
const debug = isDebugEnabled() ? new DebugPanel(document.body, [...items.keys()]) : null;

const keyboard = new KeyboardInput();
// Joystick ativo tem prioridade sobre o teclado.
const input = new PlayerInput(
  LOCAL_PLAYER,
  [touch.joystick, keyboard],
  [touch.bomb, keyboard.bomb],
  {
    remote: [touch.remote, keyboard.remote],
    mount: [touch.mount, keyboard.mount],
    special: [touch.special, keyboard.special],
  },
);

/** Cena vazia atrás dos menus (a partida só começa quando o jogador escolhe). */
class IdleScene extends Phaser.Scene {
  constructor() {
    super('idle');
  }
}

const arena = new ArenaScene(input, debug, touch);
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#14141f',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: gameConfig.render.width,
    height: gameConfig.render.height,
  },
  scene: [new IdleScene(), arena],
});

const valid = {
  characters: new Set(characters.keys()),
  maps: new Set(maps.keys()),
  levels: new Set(botConfigs.keys()),
};
const url = readUrlOptions(window.location.search, loadSettings(storage(), valid), valid);
/** Opções da partida atual (Revanche e Reiniciar repetem, com seed nova). */
let current: ArenaStart | null = null;

const screens = new Screens(
  document.body,
  {
    start: (settings) => {
      saveSettings(storage(), settings);
      startMatch({ ...extras(), settings, seed: randomSeed() });
    },
    resume,
    restart: () => {
      if (current) startMatch({ ...current, seed: randomSeed() });
    },
    quit: showTitle,
  },
  {
    characterIds: [...characters.keys()],
    mapIds: [...maps.keys()],
    levelIds: [...botConfigs.keys()],
  },
);
screens.onPauseRequest = pause;

/** Atalhos de URL de teste que valem também nas partidas seguintes. */
function extras(): Omit<ArenaStart, 'settings' | 'seed'> {
  return { botsEnabled: url.botsEnabled, roundMs: url.roundMs, winsToWin: url.winsToWin };
}

function startMatch(start: ArenaStart): void {
  current = start;
  screens.hide();
  document.body.classList.add('playing');
  screens.setPauseButtonVisible(true);
  game.scene.stop('idle');
  game.scene.start('arena', start);
}

function showTitle(): void {
  current = null;
  document.body.classList.remove('playing');
  screens.setPauseButtonVisible(false);
  if (game.scene.isActive('arena') || game.scene.isPaused('arena')) game.scene.stop('arena');
  if (!game.scene.isActive('idle')) game.scene.start('idle');
  screens.showTitle(() => screens.showSetup(loadSettings(storage(), valid)));
}

function pause(): void {
  if (!current || screens.screen !== null || arena.isPaused) return;
  arena.pause();
  screens.showPause();
}

function resume(): void {
  screens.hide();
  arena.resume();
}

arena.onMatchOver = (winnerId, wins) => {
  arena.pause();
  screens.setPauseButtonVisible(false);
  screens.showResult(winnerId, wins, arena.characters);
};

window.addEventListener('keydown', (e) => {
  if (e.code !== 'Escape' || !current) return;
  if (screens.screen === 'pause') resume();
  else pause();
});
// Sair da aba ou girar para retrato pausa a partida (o menu de pausa fica esperando).
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});
window.matchMedia('(orientation: portrait)').addEventListener('change', (e) => {
  if (e.matches) pause();
});

if (url.autostart)
  startMatch({ ...extras(), settings: url.settings, seed: url.seed ?? randomSeed() });
else showTitle();
