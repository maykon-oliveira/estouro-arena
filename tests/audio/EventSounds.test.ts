import { describe, expect, it } from 'vitest';
import type { AudioService } from '../../src/audio/AudioService';
import { EventSounds } from '../../src/audio/EventSounds';

describe('EventSounds', () => {
  it('toca o som mapeado e ignora eventos sem som', () => {
    const played: string[] = [];
    const audio: AudioService = { play: (id) => played.push(id), music: () => {} };
    const sounds = new EventSounds(audio, { 'bomba.explodiu': 'sfx_boom' });
    sounds.handle([
      { type: 'bomba.explodiu', bombId: 0, x: 1, y: 1, tiles: [] },
      { type: 'jogador.morreu', playerId: 0, cause: 'fogo' },
    ]);
    expect(played).toEqual(['sfx_boom']);
  });
});
