import type { Direction } from '../core/direction';

/**
 * Direções seguradas ao mesmo tempo; vale a última pressionada.
 * Ex.: segurando → e apertando ↑, anda para cima; soltando ↑, volta para →.
 */
export class DirectionStack {
  private readonly held: Direction[] = [];

  press(dir: Direction): void {
    this.release(dir);
    this.held.push(dir);
  }

  release(dir: Direction): void {
    const i = this.held.indexOf(dir);
    if (i !== -1) this.held.splice(i, 1);
  }

  clear(): void {
    this.held.length = 0;
  }

  current(): Direction | null {
    return this.held[this.held.length - 1] ?? null;
  }
}
