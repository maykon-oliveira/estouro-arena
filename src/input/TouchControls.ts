import { gameConfig, t, type StringKey } from '../data';
import { PressTrigger } from './PlayerInput';
import { VirtualJoystick } from './VirtualJoystick';

/** Estado de um botão pequeno: escondido, esmaecido (tem, mas não dá agora) ou pronto. */
export type ButtonState = 'hidden' | 'dim' | 'ready';

/** Os botões pequenos em volta do de bomba. */
export type SmallButton = 'remote' | 'mount' | 'special';

const SMALL_BUTTONS: readonly SmallButton[] = ['remote', 'mount', 'special'];
/** Ícone de cada botão pequeno (placeholder até a arte final). */
const ICONS: Readonly<Record<SmallButton, string>> = { remote: '📡', mount: '🐸', special: '⚡' };
const LABELS: Readonly<Record<SmallButton, StringKey>> = {
  remote: 'controls.remote',
  mount: 'controls.mount',
  special: 'controls.special',
};

/**
 * Controles de toque: joystick na metade esquerda, botão de bomba à direita e, em volta dele,
 * os botões pequenos (remota, montaria, especial), cada um só quando o jogador tem aquilo.
 */
export class TouchControls {
  readonly joystick: VirtualJoystick;
  readonly bombButton: HTMLButtonElement;
  /** Pedidos de bomba vindos do botão (fonte para o PlayerInput). */
  readonly bomb = new PressTrigger();
  /** Pedidos de cada botão pequeno. */
  readonly remote = new PressTrigger();
  readonly mount = new PressTrigger();
  readonly special = new PressTrigger();
  readonly buttons: Readonly<Record<SmallButton, HTMLButtonElement>>;
  private readonly states: Record<SmallButton, ButtonState | null> = {
    remote: null,
    mount: null,
    special: null,
  };
  private specialFill = -1;

  constructor(root: HTMLElement) {
    const { controls } = gameConfig;

    const zone = document.createElement('div');
    zone.className = 'joystick-zone';
    zone.setAttribute('aria-label', t('controls.joystick'));
    root.append(zone);
    this.joystick = new VirtualJoystick(zone, {
      radius: controls.joystickRadiusPx,
      deadZone: controls.joystickDeadZone,
      hysteresis: controls.joystickHysteresis,
    });

    this.bombButton = pressButton(
      'bomb-button',
      t('controls.bomb'),
      controls.bombButtonPx,
      this.bomb,
    );
    this.buttons = {
      remote: pressButton(
        'small-button remote-button',
        t(LABELS.remote),
        controls.actionButtonPx,
        this.remote,
      ),
      mount: pressButton(
        'small-button mount-button',
        t(LABELS.mount),
        controls.actionButtonPx,
        this.mount,
      ),
      special: pressButton(
        'small-button special-button',
        t(LABELS.special),
        controls.actionButtonPx,
        this.special,
      ),
    };
    for (const name of SMALL_BUTTONS) this.buttons[name].textContent = ICONS[name];
    root.append(this.bombButton, ...SMALL_BUTTONS.map((b) => this.buttons[b]));
    this.setButtons({ remote: 'hidden', mount: 'hidden', special: 'hidden' }, 0);

    const forceTouch = new URLSearchParams(window.location.search).has('touch');
    const showTouchUi = () => root.classList.add('touch');
    if (forceTouch || window.matchMedia('(pointer: coarse)').matches) showTouchUi();
    // Mostra o botão se o primeiro toque real acontecer num aparelho que não se declarou touch.
    window.addEventListener('pointerdown', (e) => e.pointerType === 'touch' && showTouchUi(), {
      once: true,
    });
  }

  /**
   * Mostra, esmaece ou acende cada botão pequeno; `specialFill` (0 a 1) desenha o anel da barra
   * de energia no botão de especial. Só mexe no DOM quando algo muda.
   */
  setButtons(states: Readonly<Record<SmallButton, ButtonState>>, specialFill: number): void {
    for (const name of SMALL_BUTTONS) {
      const state = states[name];
      if (state === this.states[name]) continue;
      this.states[name] = state;
      const button = this.buttons[name];
      button.hidden = state === 'hidden';
      button.classList.toggle('unavailable', state === 'dim');
    }
    // Anel em passos de 5 %, para não reescrever o estilo a cada quadro.
    const fill = Math.round(Math.min(1, Math.max(0, specialFill)) * 20) / 20;
    if (fill !== this.specialFill) {
      this.specialFill = fill;
      this.buttons.special.style.setProperty('--fill', String(fill));
    }
  }
}

/** Botão redondo que gera um pedido por toque (com estado visual "pressionado"). */
function pressButton(
  className: string,
  label: string,
  sizePx: number,
  trigger: PressTrigger,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = className;
  button.type = 'button';
  button.setAttribute('aria-label', label);
  button.style.width = button.style.height = `${sizePx}px`;
  const press = (e: PointerEvent) => {
    e.preventDefault();
    button.classList.add('pressed');
    trigger.trigger();
  };
  const unpress = () => button.classList.remove('pressed');
  button.addEventListener('pointerdown', press);
  button.addEventListener('pointerup', unpress);
  button.addEventListener('pointercancel', unpress);
  button.addEventListener('pointerleave', unpress);
  return button;
}
