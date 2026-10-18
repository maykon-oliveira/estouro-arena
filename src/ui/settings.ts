/** Escolhas da tela de Batalha (salvas entre visitas, por conveniência). */
export interface BattleSettings {
  /** Personagem do jogador (id de src/data/characters.json). */
  character: string;
  mapId: string;
  bots: number;
  level: string;
}

/** Ids válidos (vêm dos dados carregados). */
export interface ValidIds {
  characters: ReadonlySet<string>;
  maps: ReadonlySet<string>;
  levels: ReadonlySet<string>;
}

/** O pedaço do `localStorage` que usamos (injetável nos testes). */
export interface SettingsStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const DEFAULT_SETTINGS: Readonly<BattleSettings> = {
  character: 'saci',
  mapId: 'arena_01',
  bots: 3,
  level: 'medio',
};

const KEY = 'estouro.batalha';

function validBots(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 3;
}

/** Última escolha salva; o que estiver faltando ou inválido cai no padrão, campo a campo. */
export function loadSettings(store: SettingsStore | null, valid: ValidIds): BattleSettings {
  let raw: unknown;
  try {
    const text = store?.getItem(KEY);
    raw = text ? JSON.parse(text) : null;
  } catch {
    raw = null; // armazenamento bloqueado ou JSON quebrado: segue com os padrões
  }
  const saved = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const mapId = typeof saved['mapId'] === 'string' ? saved['mapId'] : '';
  const level = typeof saved['level'] === 'string' ? saved['level'] : '';
  const character = typeof saved['character'] === 'string' ? saved['character'] : '';
  return {
    character: valid.characters.has(character) ? character : DEFAULT_SETTINGS.character,
    mapId: valid.maps.has(mapId) ? mapId : DEFAULT_SETTINGS.mapId,
    bots: validBots(saved['bots']) ? saved['bots'] : DEFAULT_SETTINGS.bots,
    level: valid.levels.has(level) ? level : DEFAULT_SETTINGS.level,
  };
}

/** Salva a escolha; falha silenciosa (aba privada, armazenamento cheio ou bloqueado). */
export function saveSettings(store: SettingsStore | null, settings: BattleSettings): void {
  try {
    store?.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* sem armazenamento: a escolha só não fica salva */
  }
}

/** Opções vindas da URL (atalhos de dev e testes). */
export interface UrlOptions {
  /** Algum parâmetro de jogo presente: pula os menus. */
  autostart: boolean;
  settings: BattleSettings;
  seed: number | null;
  /** `?ia=0` deixa os adversários parados. */
  botsEnabled: boolean;
  roundMs: number | null;
  winsToWin: number | null;
}

const GAME_PARAMS = [
  'seed',
  'map',
  'personagem',
  'bots',
  'nivel',
  'ia',
  'roundMs',
  'winsToWin',
  'debug',
];

/** Lê os atalhos de URL sobre a escolha salva; valores inválidos são ignorados. */
export function readUrlOptions(search: string, base: BattleSettings, valid: ValidIds): UrlOptions {
  const params = new URLSearchParams(search);
  const num = (key: string): number | null => {
    const value = params.get(key);
    const n = value === null ? NaN : Number(value);
    return Number.isInteger(n) ? n : null;
  };
  const map = params.get('map');
  const level = params.get('nivel');
  const character = params.get('personagem');
  const bots = num('bots');
  const roundMs = num('roundMs');
  const winsToWin = num('winsToWin');
  return {
    autostart: GAME_PARAMS.some((p) => params.has(p)),
    settings: {
      character: character !== null && valid.characters.has(character) ? character : base.character,
      mapId: map !== null && valid.maps.has(map) ? map : base.mapId,
      bots: validBots(bots) ? bots : base.bots,
      level: level !== null && valid.levels.has(level) ? level : base.level,
    },
    seed: num('seed'),
    botsEnabled: params.get('ia') !== '0',
    roundMs: roundMs !== null && roundMs >= 1000 ? roundMs : null,
    winsToWin: winsToWin !== null && winsToWin >= 1 ? winsToWin : null,
  };
}
