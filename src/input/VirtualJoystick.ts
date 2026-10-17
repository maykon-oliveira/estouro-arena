import type { Direction } from '../core/direction';
import { clampToRadius, directionFromVector, type JoystickOptions } from './joystickMath';
import type { DirectionSource } from './PlayerInput';

/**
 * Joystick flutuante: aparece onde o polegar toca dentro da `zone` e segue o dedo.
 * Acompanha um único ponteiro, para outro toque (ex.: botão de bomba) não interferir.
 */
export class VirtualJoystick implements DirectionSource {
  private readonly base: HTMLDivElement;
  private readonly knob: HTMLDivElement;
  private pointerId: number | null = null;
  private origin = { x: 0, y: 0 };
  private dir: Direction | null = null;

  constructor(
    private readonly zone: HTMLElement,
    private readonly options: JoystickOptions,
  ) {
    this.base = document.createElement('div');
    this.base.className = 'joystick-base';
    this.base.style.width = this.base.style.height = `${options.radius * 2}px`;
    this.knob = document.createElement('div');
    this.knob.className = 'joystick-knob';
    this.base.append(this.knob);
    zone.append(this.base);

    zone.addEventListener('pointerdown', (e) => this.onDown(e));
    zone.addEventListener('pointermove', (e) => this.onMove(e));
    zone.addEventListener('pointerup', (e) => this.onUp(e));
    zone.addEventListener('pointercancel', (e) => this.onUp(e));
    window.addEventListener('blur', () => this.release());
  }

  current(): Direction | null {
    return this.dir;
  }

  private onDown(e: PointerEvent): void {
    if (this.pointerId !== null) return;
    e.preventDefault();
    this.pointerId = e.pointerId;
    // Captura para seguir o dedo mesmo fora da zona; falha com ponteiros sintéticos (testes e2e).
    try {
      this.zone.setPointerCapture(e.pointerId);
    } catch {
      /* segue sem captura */
    }
    const rect = this.zone.getBoundingClientRect();
    this.origin = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    this.base.style.left = `${this.origin.x}px`;
    this.base.style.top = `${this.origin.y}px`;
    this.base.classList.add('active');
    this.update(0, 0);
  }

  private onMove(e: PointerEvent): void {
    if (e.pointerId !== this.pointerId) return;
    const rect = this.zone.getBoundingClientRect();
    this.update(e.clientX - rect.left - this.origin.x, e.clientY - rect.top - this.origin.y);
  }

  private onUp(e: PointerEvent): void {
    if (e.pointerId === this.pointerId) this.release();
  }

  private release(): void {
    this.pointerId = null;
    this.dir = null;
    this.base.classList.remove('active');
  }

  private update(dx: number, dy: number): void {
    this.dir = directionFromVector(dx, dy, this.dir, this.options);
    const knob = clampToRadius(dx, dy, this.options.radius);
    this.knob.style.transform = `translate(${knob.x}px, ${knob.y}px)`;
    this.base.dataset['dir'] = this.dir ?? '';
  }
}
