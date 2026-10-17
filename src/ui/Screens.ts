import { gameConfig, t, type StringKey } from '../data';
import { playerName } from './hudModel';
import { resultTitle } from './playerPanel';
import type { BattleSettings } from './settings';

/** O que as telas pedem ao jogo (quem cuida é o main). */
export interface ScreenActions {
  start(settings: BattleSettings): void;
  resume(): void;
  restart(): void;
  quit(): void;
}

export interface SetupOptions {
  mapIds: readonly string[];
  levelIds: readonly string[];
}

const MAP_KEYS: Readonly<Record<string, StringKey>> = {
  arena_01: 'map.arena_01',
  pantanal_01: 'map.pantanal_01',
  tundra_01: 'map.tundra_01',
};
const LEVEL_KEYS: Readonly<Record<string, StringKey>> = {
  facil: 'level.facil',
  medio: 'level.medio',
  dificil: 'level.dificil',
};

/**
 * Menus em DOM sobre o canvas: Título → Batalha → (partida) → Pausa / Resultado.
 * Uma tela por vez; o foco vai para o botão principal (Enter confirma).
 */
export class Screens {
  private readonly root: HTMLElement;
  private readonly pauseButton: HTMLButtonElement;
  private current: string | null = null;

  constructor(
    parent: HTMLElement,
    private readonly actions: ScreenActions,
    private readonly setup: SetupOptions,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'menu';
    this.root.hidden = true;
    this.pauseButton = button(t('pause.button'), 'pause-button', () => this.onPauseRequest());
    this.pauseButton.textContent = 'II';
    this.pauseButton.setAttribute('aria-label', t('pause.button'));
    parent.append(this.root, this.pauseButton);
  }

  /** Chamado pelo botão de pausa; o main decide se pode pausar. */
  onPauseRequest: () => void = () => undefined;

  get screen(): string | null {
    return this.current;
  }

  /** Mostra/esconde o botão de pausa (só durante a partida). */
  setPauseButtonVisible(visible: boolean): void {
    this.pauseButton.hidden = !visible;
  }

  hide(): void {
    this.current = null;
    this.root.hidden = true;
    this.root.replaceChildren();
  }

  showTitle(onPlay: () => void): void {
    const title = document.createElement('h1');
    title.className = 'menu-title';
    title.textContent = 'ESTOURO ARENA';
    this.show('title', [title, button(t('menu.play'), 'menu-primary', onPlay)]);
  }

  showSetup(initial: BattleSettings): void {
    const settings: BattleSettings = { ...initial };
    const heading = document.createElement('h2');
    heading.textContent = t('menu.battle');

    const maps = choiceRow(
      t('menu.map'),
      this.setup.mapIds.map((id) => ({ value: id, label: label(MAP_KEYS[id], id) })),
      settings.mapId,
      (v) => (settings.mapId = v),
      'menu-cards',
    );
    const bots = choiceRow(
      t('menu.bots'),
      [1, 2, 3].map((n) => ({ value: String(n), label: String(n) })),
      String(settings.bots),
      (v) => (settings.bots = Number(v)),
    );
    const level = choiceRow(
      t('menu.level'),
      this.setup.levelIds.map((id) => ({ value: id, label: label(LEVEL_KEYS[id], id) })),
      settings.level,
      (v) => (settings.level = v),
    );
    const start = button(t('menu.start'), 'menu-primary', () => this.actions.start(settings));
    this.show('setup', [heading, maps, bots, level, start]);
  }

  showPause(): void {
    const heading = document.createElement('h2');
    heading.textContent = t('pause.title');
    this.show('pause', [
      heading,
      button(t('pause.resume'), 'menu-primary', () => this.actions.resume()),
      button(t('pause.restart'), '', () => this.actions.restart()),
      button(t('pause.quit'), '', () => this.actions.quit()),
    ]);
  }

  showResult(winnerId: number, wins: readonly number[]): void {
    const heading = document.createElement('h2');
    heading.className = 'menu-result';
    heading.textContent = resultTitle(winnerId);
    const scores = document.createElement('ul');
    scores.className = 'menu-scores';
    wins.forEach((w, id) => {
      const li = document.createElement('li');
      li.style.setProperty('--player-color', gameConfig.render.playerColors[id] ?? '#fff');
      li.textContent = `${playerName(id)}: ${'●'.repeat(w)}`;
      scores.append(li);
    });
    this.show('result', [
      heading,
      scores,
      button(t('result.rematch'), 'menu-primary', () => this.actions.restart()),
      button(t('result.menu'), '', () => this.actions.quit()),
    ]);
  }

  private show(name: string, children: HTMLElement[]): void {
    this.current = name;
    this.root.dataset['screen'] = name;
    const panel = document.createElement('div');
    panel.className = 'menu-panel';
    panel.append(...children);
    this.root.replaceChildren(panel);
    this.root.hidden = false;
    panel.querySelector<HTMLButtonElement>('.menu-primary')?.focus();
  }
}

function label(key: StringKey | undefined, fallback: string): string {
  return key ? t(key) : fallback;
}

function button(text: string, className: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  if (className) b.className = className;
  b.addEventListener('click', onClick);
  return b;
}

/** Linha de escolha única (botões que se comportam como rádio). */
function choiceRow(
  title: string,
  options: { value: string; label: string }[],
  selected: string,
  onChange: (value: string) => void,
  className = 'menu-choices',
): HTMLElement {
  const row = document.createElement('div');
  row.className = 'menu-row';
  const name = document.createElement('span');
  name.className = 'menu-row-title';
  name.textContent = title;
  const group = document.createElement('div');
  group.className = className;
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-label', title);
  const buttons = options.map((o) => {
    const b = button(o.label, '', () => {
      for (const other of buttons) other.setAttribute('aria-checked', 'false');
      b.setAttribute('aria-checked', 'true');
      onChange(o.value);
    });
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(o.value === selected));
    b.dataset['value'] = o.value;
    return b;
  });
  group.append(...buttons);
  row.append(name, group);
  return row;
}
