import type { Match } from '../core/match';
import { gameConfig, t } from '../data';
import type { GameEvent } from '../events';
import { countdownLabel, formatClock, playerName, roundEndText } from './hudModel';
import { panelChips } from './playerPanel';
import { avatarImage } from './Screens';

/**
 * HUD mínimo da partida (DOM sobre o canvas): relógio, vitórias por jogador e avisos centrais.
 * Só lê a partida e os eventos; escreve no DOM apenas quando um valor muda.
 */
export class MatchHud {
  private readonly root: HTMLElement;
  private readonly clock: HTMLElement;
  /** Bolinhas de vitória de cada jogador (ao lado do avatar). */
  private readonly scores: HTMLElement[] = [];
  private readonly bannerNote: HTMLElement;
  private readonly bannerText: HTMLElement;
  private readonly bannerSub: HTMLElement;
  private readonly panel: HTMLElement;
  /** Resultado da última rodada, mostrado acima da contagem da rodada seguinte. */
  private lastResult = '';
  /** Até quando o "Já!" fica na tela. */
  private goUntil = 0;
  /** Até quando o "Morte súbita!" fica na tela. */
  private suddenUntil = 0;
  private matchResult = '';
  /** Último valor escrito em cada elemento, para não tocar no DOM à toa. */
  private readonly written = new Map<HTMLElement, string>();

  /** `characters`: personagem de cada jogador (índice = id), para avatar e nomes. */
  constructor(
    parent: HTMLElement,
    players: number,
    private readonly characters: readonly (string | null)[] = [],
  ) {
    this.root = document.createElement('div');
    this.root.className = 'match-hud';

    const top = document.createElement('div');
    top.className = 'hud-top';
    this.clock = document.createElement('div');
    this.clock.className = 'hud-clock';

    const colors = gameConfig.render.playerColors;
    const cards: HTMLElement[] = [];
    for (let id = 0; id < players; id++) {
      const card = document.createElement('div');
      card.className = 'hud-score';
      card.style.setProperty('--player-color', colors[id] ?? '#ffffff');
      card.setAttribute('aria-label', playerName(id, characters));
      card.dataset['character'] = characters[id] ?? '';
      const avatar = avatarImage(characters[id] ?? null);
      if (avatar) card.append(avatar);
      const pips = document.createElement('span');
      card.append(pips);
      cards.push(card);
      this.scores.push(pips);
    }
    // Metade dos jogadores de cada lado do relógio.
    const half = Math.ceil(players / 2);
    top.append(...cards.slice(0, half), this.clock, ...cards.slice(half));

    const banner = document.createElement('div');
    banner.className = 'hud-banner';
    this.bannerNote = document.createElement('div');
    this.bannerNote.className = 'hud-banner-note';
    this.bannerText = document.createElement('div');
    this.bannerText.className = 'hud-banner-text';
    this.bannerSub = document.createElement('div');
    this.bannerSub.className = 'hud-banner-sub';
    banner.append(this.bannerNote, this.bannerText, this.bannerSub);

    this.panel = document.createElement('div');
    this.panel.className = 'player-panel';

    this.root.append(top, banner, this.panel);
    parent.append(this.root);
  }

  /** Reage aos eventos do tick (avisos de início, fim de rodada e fim de partida). */
  handle(events: readonly GameEvent[], nowMs: number): void {
    for (const e of events) {
      if (e.type === 'rodada.iniciou') {
        this.lastResult = '';
        this.goUntil = nowMs + gameConfig.hud.goBannerMs;
      } else if (e.type === 'morte_subita.iniciou') {
        this.suddenUntil = nowMs + gameConfig.hud.suddenDeathBannerMs;
      } else if (e.type === 'rodada.terminou') {
        this.lastResult = roundEndText(e.winnerId, this.characters);
      } else if (e.type === 'partida.terminou') {
        this.matchResult = t('match.win', { player: playerName(e.winnerId, this.characters) });
      }
    }
  }

  /** Atualiza o HUD a partir do estado da partida (chamado a cada quadro; barato). */
  update(match: Match, nowMs: number): void {
    const { tickRate } = match.world.rules;
    this.setData('phase', match.phase);
    this.setData('round', match.round.toString());
    this.setData('sudden', match.world.collapse ? '1' : '0');
    this.write(this.clock, formatClock(match.clockTicks, tickRate));

    const { winsToWin } = match.options.matchRules;
    this.scores.forEach((el, id) => {
      const wins = match.wins[id] ?? 0;
      this.write(el, '●'.repeat(wins) + '○'.repeat(Math.max(0, winsToWin - wins)));
    });

    let note = '';
    let text = '';
    let sub = '';
    if (match.phase === 'countdown') {
      note = this.lastResult;
      text = countdownLabel(match.phaseTicks, tickRate);
      sub = t('round.label', { round: match.round });
    } else if (match.phase === 'over') {
      note = this.lastResult;
      text = this.matchResult;
    } else if (nowMs < this.suddenUntil) {
      text = t('round.sudden_death');
    } else if (nowMs < this.goUntil) {
      text = t('round.go');
    }
    const me = match.world.players[0];
    this.write(this.panel, me ? panelChips(me).join('   ') : '');
    this.write(this.bannerNote, note);
    this.write(this.bannerText, text);
    this.write(this.bannerSub, sub);
  }

  destroy(): void {
    this.root.remove();
  }

  private write(el: HTMLElement, value: string): void {
    if (this.written.get(el) === value) return;
    this.written.set(el, value);
    el.textContent = value;
  }

  private setData(key: string, value: string): void {
    if (this.root.dataset[key] !== value) this.root.dataset[key] = value;
  }
}
