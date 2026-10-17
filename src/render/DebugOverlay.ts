import type Phaser from 'phaser';
import { explosionTiles } from '../core/bombs';
import type { World } from '../core/world';
import type { DebugLayers } from '../ui/DebugPanel';

const GRID_COLOR = 0xffffff;
const HITBOX_COLOR = 0x00e5ff;
const RADIUS_COLOR = 0xff1744;

/** Desenha grade, hitbox e prévia do raio das bombas por cima da arena. Só lê o mundo. */
export class DebugOverlay {
  constructor(
    private readonly g: Phaser.GameObjects.Graphics,
    private readonly origin: { x: number; y: number },
    private readonly tile: number,
  ) {}

  draw(world: World, layers: DebugLayers): void {
    const { g, origin, tile } = this;
    const { cols, rows } = world.grid;
    g.clear();

    if (layers.grid) {
      g.lineStyle(1, GRID_COLOR, 0.15);
      for (let x = 0; x <= cols; x++) {
        g.lineBetween(origin.x + x * tile, origin.y, origin.x + x * tile, origin.y + rows * tile);
      }
      for (let y = 0; y <= rows; y++) {
        g.lineBetween(origin.x, origin.y + y * tile, origin.x + cols * tile, origin.y + y * tile);
      }
    }

    if (layers.radius) {
      for (const bomb of world.bombs) {
        g.lineStyle(2, RADIUS_COLOR, 0.8);
        for (const t of explosionTiles(world, bomb).tiles) {
          g.strokeRect(origin.x + t.x * tile + 3, origin.y + t.y * tile + 3, tile - 6, tile - 6);
        }
      }
    }

    if (layers.hitbox) {
      for (const p of world.players) {
        if (!p.alive) continue;
        g.lineStyle(2, HITBOX_COLOR, 1);
        g.strokeRect(
          origin.x + Math.round(p.x) * tile,
          origin.y + Math.round(p.y) * tile,
          tile,
          tile,
        );
        g.fillStyle(HITBOX_COLOR);
        g.fillCircle(origin.x + (p.x + 0.5) * tile, origin.y + (p.y + 0.5) * tile, 2);
      }
    }
  }
}
