import { describe, expect, it } from 'vitest';
import { characters } from '../../src/data';
import {
  characterName,
  characterPassive,
  countdownLabel,
  formatClock,
  playerName,
  roundEndText,
} from '../../src/ui/hudModel';

describe('formatClock', () => {
  it('formata m:ss arredondando os segundos para cima', () => {
    expect(formatClock(120 * 60, 60)).toBe('2:00');
    expect(formatClock(120 * 60 - 1, 60)).toBe('2:00');
    expect(formatClock(61 * 60, 60)).toBe('1:01');
    expect(formatClock(9 * 60, 60)).toBe('0:09');
    expect(formatClock(1, 60)).toBe('0:01');
    expect(formatClock(0, 60)).toBe('0:00');
  });

  it('nunca fica negativo', () => {
    expect(formatClock(-10, 60)).toBe('0:00');
  });
});

describe('countdownLabel', () => {
  it('conta 3, 2, 1 por segundos arredondados para cima', () => {
    expect(countdownLabel(180, 60)).toBe('3');
    expect(countdownLabel(121, 60)).toBe('3');
    expect(countdownLabel(120, 60)).toBe('2');
    expect(countdownLabel(1, 60)).toBe('1');
    expect(countdownLabel(0, 60)).toBe('1');
  });
});

describe('textos de jogador', () => {
  it('nomeia os jogadores pela cor', () => {
    expect(playerName(0)).toBe('Vermelho');
    expect(playerName(3)).toBe('Amarelo');
    expect(playerName(7)).toBe('#8');
  });

  it('com personagem, usa o nome dele; sem, a cor', () => {
    const cast = ['iara', null, 'mula_sem_cabeca'];
    expect(playerName(0, cast)).toBe('Iara');
    expect(playerName(1, cast)).toBe('Azul');
    expect(playerName(2, cast)).toBe('Mula sem Cabeça');
  });

  it('todo personagem tem nome e passiva nos textos', () => {
    for (const id of characters.keys()) {
      expect(characterName(id)).not.toContain('character.');
      expect(characterPassive(id)).not.toContain('character.');
    }
  });

  it('monta o aviso de fim de rodada', () => {
    expect(roundEndText(1)).toBe('Azul venceu a rodada!');
    expect(roundEndText(1, ['saci', 'boto'])).toBe('Boto venceu a rodada!');
    expect(roundEndText(null)).toBe('Empate!');
  });
});
