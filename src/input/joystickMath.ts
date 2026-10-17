import type { Direction } from '../core/direction';

export interface JoystickOptions {
  /** Raio do joystick, em px de CSS. */
  radius: number;
  /** Fração do raio abaixo da qual não há direção. */
  deadZone: number;
  /** Quanto (fração) o outro eixo precisa superar o atual para trocar de direção. */
  hysteresis: number;
}

function axisDirection(dx: number, dy: number, horizontal: boolean): Direction {
  if (horizontal) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

/** Vetor do dedo (relativo ao centro do joystick) → uma das 4 direções. */
export function directionFromVector(
  dx: number,
  dy: number,
  current: Direction | null,
  { radius, deadZone, hysteresis }: JoystickOptions,
): Direction | null {
  if (Math.hypot(dx, dy) < radius * deadZone || (dx === 0 && dy === 0)) return null;

  const ax = Math.abs(dx);
  const ay = Math.abs(dy);

  // Mantém a direção atual enquanto o eixo dela tem o mesmo sinal e o outro não a supera com folga.
  if (current !== null) {
    const horizontal = current === 'left' || current === 'right';
    const along = horizontal ? ax : ay;
    const other = horizontal ? ay : ax;
    if (along > 0 && axisDirection(dx, dy, horizontal) === current) {
      if (other <= along * (1 + hysteresis)) return current;
    }
  }

  return axisDirection(dx, dy, ax >= ay);
}

/** Limita o vetor ao raio, mantendo a direção (posição do pino). */
export function clampToRadius(dx: number, dy: number, radius: number): { x: number; y: number } {
  const length = Math.hypot(dx, dy);
  if (length <= radius) return { x: dx, y: dy };
  const k = radius / length;
  return { x: dx * k, y: dy * k };
}
