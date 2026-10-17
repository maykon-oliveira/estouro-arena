import type { GameEvent, GameEventType } from '../events';
import type { AudioService } from './AudioService';

/** Toca o som mapeado (src/data/sounds.json) para cada evento. Som novo não mexe no core. */
export class EventSounds {
  constructor(
    private readonly audio: AudioService,
    private readonly mapping: Readonly<Partial<Record<GameEventType, string>>>,
  ) {}

  handle(events: readonly GameEvent[]): void {
    for (const event of events) {
      const soundId = this.mapping[event.type];
      if (soundId) this.audio.play(soundId);
    }
  }
}
