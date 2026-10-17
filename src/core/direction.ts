export type Direction = 'up' | 'down' | 'left' | 'right';

export const DIRECTION_VECTORS: Readonly<Record<Direction, { dx: -1 | 0 | 1; dy: -1 | 0 | 1 }>> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};
