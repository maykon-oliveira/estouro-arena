export interface AudioService {
  play(soundId: string): void;
  music(trackId: string | null): void;
}

/** Implementação do MVP: não toca nada. */
export class SilentAudio implements AudioService {
  play(): void {}
  music(): void {}
}
