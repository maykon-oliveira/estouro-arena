import type { DebugInfo } from './debugInfo';

export interface DebugLayers {
  grid: boolean;
  hitbox: boolean;
  radius: boolean;
}

/** Ferramenta de desenvolvimento: rótulos ficam aqui, fora de strings.pt-BR.json. */
const LABELS: Readonly<Record<keyof DebugInfo, string>> = {
  fps: 'fps',
  tick: 'tick',
  seed: 'seed',
  map: 'mapa',
  pos: 'pos',
  tile: 'tile',
  alive: 'estado',
  bombs: 'bombas',
  range: 'alcance',
  speed: 'patins',
  blocks: 'blocos',
};

const LAYER_LABELS: Readonly<Record<keyof DebugLayers, string>> = {
  grid: 'grade',
  hitbox: 'hitbox',
  radius: 'raio',
};

const NO_REQUESTS: readonly string[] = [];

/** Atualizações de texto por segundo (o painel não precisa de 60 fps). */
const REFRESH_PER_SECOND = 10;

/** `?debug=1` liga o painel. */
export function isDebugEnabled(search = window.location.search): boolean {
  return new URLSearchParams(search).get('debug') === '1';
}

/** Painel de debug em DOM: só lê o estado; ações apenas recarregam a página. */
export class DebugPanel {
  readonly layers: DebugLayers = { grid: true, hitbox: true, radius: true };
  private readonly root: HTMLElement;
  private readonly values = new Map<keyof DebugInfo, HTMLElement>();
  private lastRefresh = -Infinity;
  /** Itens pedidos pelos botões desde a última leitura (viram comandos `debugItem`). */
  private readonly itemRequests: string[] = [];
  /** Pedidos de barra cheia (viram comandos `debugEnergy`). */
  private energyRequests = 0;

  /** `itemIds`: um botão por item, que põe o item no tile do jogador local. */
  constructor(parent: HTMLElement, itemIds: readonly string[] = []) {
    this.root = document.createElement('div');
    this.root.className = 'debug-panel';

    const table = document.createElement('dl');
    for (const key of Object.keys(LABELS) as (keyof DebugInfo)[]) {
      const dt = document.createElement('dt');
      dt.textContent = LABELS[key];
      const dd = document.createElement('dd');
      table.append(dt, dd);
      this.values.set(key, dd);
    }

    const toggles = document.createElement('div');
    for (const key of Object.keys(LAYER_LABELS) as (keyof DebugLayers)[]) {
      const label = document.createElement('label');
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = this.layers[key];
      box.addEventListener('change', () => (this.layers[key] = box.checked));
      label.append(box, ` ${LAYER_LABELS[key]}`);
      toggles.append(label);
    }

    const actions = document.createElement('div');
    actions.append(
      this.button('reiniciar', () => window.location.reload()),
      this.button('nova seed', () => {
        const params = new URLSearchParams(window.location.search);
        params.set('seed', Math.floor(Math.random() * 2 ** 32).toString());
        window.location.search = params.toString();
      }),
    );

    const itemButtons = document.createElement('div');
    itemButtons.className = 'debug-items';
    for (const id of itemIds) {
      itemButtons.append(this.button(`+ ${id}`, () => this.itemRequests.push(id)));
    }
    itemButtons.append(this.button('+ energia', () => this.energyRequests++));

    this.root.append(table, toggles, actions, itemButtons);
    parent.append(this.root);
  }

  /** Devolve e zera os pedidos de barra cheia. */
  takeEnergyRequests(): number {
    const n = this.energyRequests;
    this.energyRequests = 0;
    return n;
  }

  /** Devolve e esvazia os pedidos de item feitos pelos botões. */
  takeItemRequests(): readonly string[] {
    // Sem pedidos (quase sempre): não aloca um array novo por quadro.
    if (this.itemRequests.length === 0) return NO_REQUESTS;
    return this.itemRequests.splice(0, this.itemRequests.length);
  }

  /** Chamada a cada quadro; redesenha o texto no máximo REFRESH_PER_SECOND vezes por segundo. */
  update(nowMs: number, info: () => DebugInfo): void {
    if (nowMs - this.lastRefresh < 1000 / REFRESH_PER_SECOND) return;
    this.lastRefresh = nowMs;
    const data = info();
    for (const [key, el] of this.values) {
      el.textContent = data[key];
      this.root.dataset[key] = data[key];
    }
  }

  private button(text: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.addEventListener('click', onClick);
    return b;
  }
}
