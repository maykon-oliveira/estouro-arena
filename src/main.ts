import Phaser from 'phaser';
import { ArenaScene } from './render/ArenaScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#14141f',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 854,
    height: 480,
  },
  scene: [ArenaScene],
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.pause();
  else game.resume();
});
