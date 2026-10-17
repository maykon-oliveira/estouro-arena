# CLAUDE.md — Estouro Arena

Instruções para agentes de IA (Claude Code e similares) que trabalham neste repositório. Leia este arquivo inteiro antes de qualquer tarefa.

## O projeto

**Estouro Arena** é um jogo de arena com bombas em grade (gênero "bomber"), para navegador mobile **na horizontal**, instalável como PWA. Personagens do folclore brasileiro, montarias da fauna brasileira, terrenos variados (água, mato alto, gelo, esteiras…).

- Design completo: [`docs/GDD.md`](docs/GDD.md) — fonte da verdade das regras.
- Elenco e montarias: [`docs/PERSONAGENS.md`](docs/PERSONAGENS.md).
- Convenções de arte: [`docs/ASSETS.md`](docs/ASSETS.md).
- Decisões tomadas: [`docs/DECISIONS.md`](docs/DECISIONS.md) — não desfaça uma decisão sem registrar a nova.

Se um pedido contradiz o GDD, pergunte antes de implementar e, se aprovado, atualize o GDD no mesmo commit.

## Stack

| Camada | Escolha |
| --- | --- |
| Engine | Phaser 3 (versão estável) |
| Linguagem | TypeScript, `strict: true` |
| Build/dev | Vite |
| Testes | Vitest (simulação) + Playwright (smoke) |
| Validação de dados | Zod (schemas dos JSON em `src/data/schemas.ts`) |
| Mapas | Tiled (JSON) ou formato ASCII próprio (ver GDD §4) |
| Áudio | Interface `AudioService`; `SilentAudio` no MVP; Howler.js depois |
| PWA | vite-plugin-pwa, `orientation: landscape` |
| Deploy | Vercel (site estático) |

Gerenciador de pacotes: **npm**. Node LTS.

## Comandos

```bash
npm install          # dependências
npm run dev          # servidor local (use --host para testar no celular na mesma rede)
npm test             # Vitest
npm run test:e2e     # Playwright
npm run lint         # ESLint + Prettier
npm run build        # build de produção
```

(Os scripts serão criados na Fase 0. Se não existirem ainda, crie-os.)

## Arquitetura — regras obrigatórias

```
src/
  core/      # simulação pura: grade, entidades, regras, bots. NUNCA importa Phaser nem DOM.
  data/      # JSON de conteúdo: terrenos, itens, personagens, montarias, fases, sons + schemas Zod
  render/    # cenas Phaser, sprites, câmera, efeitos — só lê estado e escuta eventos
  input/     # joystick virtual, teclado, gamepad → comandos (Command)
  audio/     # AudioService + implementações
  ui/        # menus, HUD
  events.ts  # tipos de todos os eventos do jogo
tests/       # testes da simulação (espelham src/core)
assets/themes/<tema>/   # atlas, spritesheets e manifest.json
```

1. **`src/core` é puro.** Sem Phaser, sem `window`, sem `Math.random` direto (use o RNG com seed do core), sem `Date.now`. Tick fixo de 60/s. Isso mantém o jogo testável, com replays determinísticos e pronto para multiplayer.
2. **Fluxo único:** Entrada → `Command` → simulação → `GameEvent` → render/áudio/rede. Render, áudio e rede nunca alteram o estado do jogo.
3. **Tudo que é conteúdo ou balanceamento fica em `src/data/*.json`** (pavio, velocidade, alcance, efeitos de terreno, passivas). Nada de números mágicos no código. Todo JSON é validado por um schema Zod na carga.
4. **Imagens só por nome lógico** (`player.saci.walk.down`, `tile.agua_rasa`, `fx.explosion`) resolvido pelo `manifest.json` do tema. Nunca caminhos de arquivo no código.
5. **Som:** emitir eventos; o mapeamento evento → som vive em `src/data/sounds.json`. Adicionar som não pode exigir mudar o core.
6. **Novo terreno, item, personagem ou montaria** = nova entrada em JSON + (se preciso) um handler registrado por id. Evite `switch` gigantes espalhados.

## Como trabalhar (ciclo por feature)

1. Leia a seção relevante do GDD.
2. Escreva uma mini-spec curta (regras, casos de borda, eventos emitidos) e confirme se houver ambiguidade.
3. Escreva os testes do core primeiro (Vitest).
4. Implemente até passar.
5. Conecte render/input e verifique no navegador (paisagem, viewport de celular).
6. Rode `npm test`, `npm run lint` e `npm run build` — tudo deve passar antes de concluir.
7. Commits pequenos, mensagem em português no imperativo (`Adiciona terreno de gelo`).

Faça uma feature por vez. Não refatore áreas não relacionadas sem pedir.

## Mobile

- Layout pensado para paisagem; em retrato, mostrar aviso "gire o aparelho".
- Phaser com `scale.mode = FIT`, `pixelArt: true`.
- HUD respeita `env(safe-area-inset-*)`.
- Joystick virtual flutuante na metade esquerda; botão de bomba (≥ 72 px) e botão de ação à direita.
- Pausar em `visibilitychange`.
- Meta: 60 fps em Android intermediário. Evite alocar objetos por frame (use pools).

## Convenções de código

- TypeScript strict, sem `any` (use `unknown` + validação).
- Nomes de código em inglês (`Bomb`, `Tile`, `explode`); textos do jogo em português, centralizados em `src/data/strings.pt-BR.json` (pronto para i18n).
- Ids de conteúdo em `snake_case` português, iguais aos do GDD (`agua_rasa`, `mato_alto`, `saci`, `capivara`).
- Funções do core pequenas e puras sempre que possível.
- Debug: painel ativado por `?debug=1` mostrando grade, hitboxes e raio das bombas, e permitindo spawnar itens.

## Arte e propriedade intelectual

- Placeholders: Kenney (CC0) ou formas coloridas. Arte final: PixelLab (pixel art 32 × 32, top-down 3/4). Avatares: DiceBear, só estilos CC0.
- **Nunca** usar o nome "Bomberman", personagens/sprites dos jogos da Hudson/Konami, nem visuais de adaptações recentes do folclore (novelas, séries). Nunca usar nome ou imagem de pessoas reais.

## Fase atual

**Fase 0 — Fundação** (ver GDD §9): projeto Vite + Phaser + TS, este CLAUDE.md, testes e deploy; grade, movimento com joystick, bomba e explosão em cruz; placeholders e painel de debug.
Portão para a Fase 1: um jogador explode blocos rodando num celular real.
