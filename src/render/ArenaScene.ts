import Phaser from 'phaser';

// Placeholder da Fase 0: desenha uma grade vazia 15 × 13 só para validar o pipeline.
// Será substituída pela renderização do estado do core.
const COLS = 15;
const ROWS = 13;
const TILE = 32;

export class ArenaScene extends Phaser.Scene {
  constructor() {
    super('arena');
  }

  create(): void {
    const { width, height } = this.scale.gameSize;
    const offsetX = Math.floor((width - COLS * TILE) / 2);
    const offsetY = Math.floor((height - ROWS * TILE) / 2);
    const g = this.add.graphics();

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const border = x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1;
        const pillar = x % 2 === 0 && y % 2 === 0;
        g.fillStyle(border || pillar ? 0x4a4a6a : 0x2e7d32);
        g.fillRect(offsetX + x * TILE, offsetY + y * TILE, TILE, TILE);
      }
    }
  }
}
