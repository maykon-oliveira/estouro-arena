import { gameConfig, t } from '../data';
import { PressTrigger } from './PlayerInput';
import { VirtualJoystick } from './VirtualJoystick';

/** Controles de toque: joystick na metade esquerda, botões de bomba e de ação à direita. */
export class TouchControls {
  readonly joystick: VirtualJoystick;
  readonly bombButton: HTMLButtonElement;
  /** Pedidos de bomba vindos do botão (fonte de ação para o PlayerInput). */
  readonly bomb = new PressTrigger();
  readonly actionButton: HTMLButtonElement;
  /** Pedidos de ação vindos do botão de ação. */
  readonly action = new PressTrigger();
  private actionAvailable: boolean | null = null;

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
    this.actionButton = pressButton(
      'action-button',
      t('controls.action'),
      controls.actionButtonPx,
      this.action,
    );
    this.setActionAvailable(false);
    root.append(this.bombButton, this.actionButton);

    const forceTouch = new URLSearchParams(window.location.search).has('touch');
    const showTouchUi = () => root.classList.add('touch');
    if (forceTouch || window.matchMedia('(pointer: coarse)').matches) showTouchUi();
    // Mostra o botão se o primeiro toque real acontecer num aparelho que não se declarou touch.
    window.addEventListener('pointerdown', (e) => e.pointerType === 'touch' && showTouchUi(), {
      once: true,
    });
  }

  /** Esmaece o botão de ação quando não há ação (só mexe no DOM quando muda). */
  setActionAvailable(available: boolean): void {
    if (available === this.actionAvailable) return;
    this.actionAvailable = available;
    this.actionButton.classList.toggle('unavailable', !available);
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
