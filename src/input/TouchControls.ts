import { gameConfig, t } from '../data';
import { VirtualJoystick } from './VirtualJoystick';

/** Controles de toque: joystick na metade esquerda, botão de bomba à direita. */
export class TouchControls {
  readonly joystick: VirtualJoystick;
  readonly bombButton: HTMLButtonElement;

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

    // Só visual por enquanto: o comando de bomba entra junto com a bomba no core.
    this.bombButton = document.createElement('button');
    this.bombButton.className = 'bomb-button';
    this.bombButton.type = 'button';
    this.bombButton.setAttribute('aria-label', t('controls.bomb'));
    this.bombButton.style.width = this.bombButton.style.height = `${controls.bombButtonPx}px`;
    const press = (e: PointerEvent) => {
      e.preventDefault();
      this.bombButton.classList.add('pressed');
    };
    const unpress = () => this.bombButton.classList.remove('pressed');
    this.bombButton.addEventListener('pointerdown', press);
    this.bombButton.addEventListener('pointerup', unpress);
    this.bombButton.addEventListener('pointercancel', unpress);
    this.bombButton.addEventListener('pointerleave', unpress);
    root.append(this.bombButton);

    const forceTouch = new URLSearchParams(window.location.search).has('touch');
    const showTouchUi = () => root.classList.add('touch');
    if (forceTouch || window.matchMedia('(pointer: coarse)').matches) showTouchUi();
    // Mostra o botão se o primeiro toque real acontecer num aparelho que não se declarou touch.
    window.addEventListener('pointerdown', (e) => e.pointerType === 'touch' && showTouchUi(), {
      once: true,
    });
  }
}
