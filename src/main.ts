import Phaser from 'phaser';
import { gameConfig, t } from './data';
import { KeyboardInput } from './input/KeyboardInput';
import { PlayerInput } from './input/PlayerInput';
import { TouchControls } from './input/TouchControls';
import { ArenaScene } from './render/ArenaScene';
import { DebugPanel, isDebugEnabled } from './ui/DebugPanel';

const LOCAL_PLAYER = 0;

function byId(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} não encontrado no index.html`);
  return el;
}

byId('rotate-warning').textContent = t('rotate_warning');

const touch = new TouchControls(byId('controls'));
const debug = isDebugEnabled() ? new DebugPanel(document.body) : null;

const keyboard = new KeyboardInput();
// Joystick ativo tem prioridade sobre o teclado.
const input = new PlayerInput(LOCAL_PLAYER, [touch.joystick, keyboard], [touch.bomb, keyboard]);

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
  scene: [new ArenaScene(input, debug)],
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.pause();
  else game.resume();
});
