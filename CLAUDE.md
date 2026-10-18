# CLAUDE.md — Estouro Arena

Instruções para agentes de IA (Claude Code e similares) que trabalham neste repositório. Leia este arquivo inteiro antes de qualquer tarefa e, em seguida, [`docs/STATUS.md`](docs/STATUS.md) para saber onde o trabalho parou.

## O projeto

**Estouro Arena** é um jogo de arena com bombas em grade (gênero "bomber"), para navegador mobile **na horizontal**, instalável como PWA. Personagens do folclore brasileiro, montarias da fauna brasileira, terrenos variados (água, mato alto, gelo, esteiras…).

- Design completo: [`docs/GDD.md`](docs/GDD.md) — fonte da verdade das regras.
- Elenco e montarias: [`docs/PERSONAGENS.md`](docs/PERSONAGENS.md).
- Convenções de arte: [`docs/ASSETS.md`](docs/ASSETS.md).
- Decisões tomadas: [`docs/DECISIONS.md`](docs/DECISIONS.md) — não desfaça uma decisão sem registrar a nova.
- Specs por feature: [`docs/specs/`](docs/specs/) — como cada regra funciona de fato, com casos de borda.
- Onde parei: [`docs/STATUS.md`](docs/STATUS.md) — fase, próximo passo e pendências.

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
| Deploy | Coolify (`Dockerfile` multi-stage: build com Bun, nginx serve o `dist/`) |

Gerenciador de pacotes e runner de scripts: **Bun** (`bun.lock` versionado). Node LTS continua instalado (ferramentas como Vite/Vitest rodam sobre ele).

## Comandos

```bash
bun install          # dependências
bun run dev          # servidor local (`bun run dev --host`: celular na mesma rede; o terminal mostra um QR code)
bun run test         # Vitest — atenção: `bun test` (sem "run") chama o runner do Bun, não o Vitest
bun run test:e2e     # Playwright: smoke contra o build de produção (1ª vez: bunx playwright install chromium)
bun run lint         # ESLint + Prettier
bun run format       # aplica o Prettier
bun run build        # typecheck + build de produção
bun run tiles        # regenera as texturas de terreno (DiceBear) a partir de assets/themes/default/tiles.dicebear.json
bun run avatars      # regenera os avatares dos personagens (DiceBear pixel-art) a partir de assets/themes/default/avatars.dicebear.json
```

(Se algum script ainda não existir, crie-o.)

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
tests/       # Vitest: espelham src/ (core, data, input, ui, audio)
e2e/         # Playwright: smoke contra o build de produção
docs/specs/  # uma mini-spec por feature
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
2. Escreva a mini-spec em `docs/specs/<feature>.md` (regras, casos de borda, eventos emitidos, dados, testes, pendências — ver `docs/specs/README.md`) e confirme se houver ambiguidade. A spec é commitada junto com a feature e atualizada se a implementação mudar a regra.
3. Escreva os testes do core primeiro (Vitest).
4. Implemente até passar.
5. Conecte render/input e verifique no navegador (paisagem, viewport de celular).
6. Rode `bun run test`, `bun run lint`, `bun run build` e `bun run test:e2e` — tudo deve passar antes de concluir.
7. **Feche a documentação** no mesmo commit:
   - marque a spec como feita (e o índice em `docs/specs/README.md`);
   - atualize o que a feature tornou desatualizado (GDD se a regra mudou, `DECISIONS.md`, README, "Fase atual" abaixo);
   - reescreva [`docs/STATUS.md`](docs/STATUS.md) para a próxima sessão começar sabendo onde parou.
   - escreva o roteiro do post da feature em `roteiros/post-NN-<tema>.md` (pasta fora do git; formato, guia de estilo e numeração em `roteiros/README.md`): fala do autor + animação, cena a cena, 60–90 s, em inglês, explicando regra, decisão e matemática.
   Vale também ao fechar uma fase.
8. Commits pequenos no formato [Conventional Commits](https://www.conventionalcommits.org/pt-br/), assunto em português no imperativo: `feat(terrenos): Adiciona gelo`. O escopo da feature é o nome da spec (`partida-e-rodadas`, `bots`…). Tipos: `feat` (feature), `fix` (correção), `docs(specs)` (spec nova ou mudada), `docs`, `test`, `refactor`, `chore`, `ci`. O hook `commit-msg` (commitlint) recusa mensagem fora do formato.
9. **Versões são automáticas:** a cada push na `main`, o GitHub Actions roda testes, lint e build e o `semantic-release` lê os commits (`feat` → minor, `fix` → patch), atualiza o `CHANGELOG.md`, cria a tag `vX.Y.Z` e a GitHub Release. Não edite versão nem changelog à mão.
10. **Ao fechar uma fase** (portão cumprido), crie a tag anotada `fase-N` no commit que fecha a fase e envie: `git tag -a fase-1 -m "Fase 1 — …" && git push origin fase-1`.

Faça uma feature por vez. Não refatore áreas não relacionadas sem pedir.

## Mobile

- Layout pensado para paisagem; em retrato, mostrar aviso "gire o aparelho".
- Phaser com `scale.mode = FIT`, `pixelArt: true`.
- HUD respeita `env(safe-area-inset-*)`.
- Joystick virtual flutuante na metade esquerda; botão de bomba (≥ 72 px) à direita, com os botões pequenos (remota, montaria, especial) em volta, cada um só quando o jogador tem aquilo.
- Pausar em `visibilitychange`.
- Meta: 60 fps em Android intermediário. Evite alocar objetos por frame (use pools).

## Convenções de código

- TypeScript strict, sem `any` (use `unknown` + validação).
- Nomes de código em inglês (`Bomb`, `Tile`, `explode`); textos do jogo em português, centralizados em `src/data/strings.pt-BR.json` (pronto para i18n).
- Ids de conteúdo em `snake_case` português, iguais aos do GDD (`agua_rasa`, `mato_alto`, `saci`, `capivara`).
- Funções do core pequenas e puras sempre que possível.
- Debug: painel ativado por `?debug=1` mostrando grade, hitboxes e raio das bombas, e permitindo spawnar itens.

## Arte e propriedade intelectual

- Texturas de terreno: DiceBear 10, só estilos abstratos **CC0**, geradas no desenvolvimento (`bun run tiles`) e versionadas como SVG — ver [`docs/specs/tema-dicebear.md`](docs/specs/tema-dicebear.md). Avatares dos personagens: DiceBear `pixel-art` (CC0, `bun run avatars`). Personagens na arena, itens e bombas: formas coloridas por enquanto. PixelLab (pixel art 32 × 32) é pago e ficou adiado.
- **Nunca** usar o nome "Bomberman", personagens/sprites dos jogos da Hudson/Konami, nem visuais de adaptações recentes do folclore (novelas, séries). Nunca usar nome ou imagem de pessoas reais.

## DiceBear

Use DiceBear 10. Documentation: https://www.dicebear.com/llms.txt

There are seven native cores with identical output, not one library with
wrappers. Use the one matching this project's language. Do not reach for the
JavaScript core when the project is written in something else:

    JavaScript  @dicebear/core + @dicebear/styles
    PHP         dicebear/core + dicebear/styles
    Python      dicebear-core + dicebear-styles
    Rust        dicebear-core + dicebear-styles
    Go          github.com/dicebear/dicebear-go/v10 + github.com/dicebear/styles/v10
    Dart        dicebear_core + dicebear_styles
    C#          DiceBear.Core + DiceBear.Styles

Every style page carries a loading snippet for all seven, for example
https://www.dicebear.com/styles/lorelei/index.md

HTTP API: https://api.dicebear.com/10.x/<style>/svg?seed=<seed> The seed is a
query parameter, not a path segment. Options are query parameters too; array
values are separated by commas.

Options named after a component end in Variant: eyesVariant, not eyes. This
holds in all seven cores and in the HTTP API. Look up the options of a style at
https://api.dicebear.com/10.x/<style>/options.json

Write these forms, not the ones on the left. The left column is pre-10 and the
API does not reject it, so an outdated call runs and silently does the wrong
thing:

    avatars.dicebear.com/api/<style>/<seed>.svg  ->  api.dicebear.com/10.x/<style>/svg?seed=<seed>
    api.dicebear.com/9.x/<style>/svg             ->  api.dicebear.com/10.x/<style>/svg
    npm install @dicebear/collection             ->  npm install @dicebear/styles
    npm install @dicebear/lorelei                ->  npm install @dicebear/styles
    createAvatar(lorelei, { seed })              ->  new Avatar(new Style(definition), { seed })
    { eyes: ['variant01'] }                      ->  { eyesVariant: ['variant01'] }
    ?radius=50                                   ->  ?borderRadius=50

Only JavaScript and the HTTP API have a pre-10 form. The other six cores were
released in 2026 and never had one, so any older-looking PHP, Python, Rust, Go,
Dart or C# API attributed to DiceBear is invented rather than outdated.

## Fase atual

**Fase 2 — Arte e conteúdo** (ver GDD §9): personagens com passiva, carga de energia e especiais, bombas elementais; campanha com 2 biomas (Pantanal e Tundra) de 6 fases e 1 chefe cada; sprites finais, tema visual e avatares DiceBear. Ordem proposta dos 10 passos em [`docs/specs/README.md`](docs/specs/README.md), com perguntas em aberto em [`docs/STATUS.md`](docs/STATUS.md). Passos 1 (personagens e passivas) e 2 (energia e especiais) feitos.
Portão para a Fase 3: 60 fps num Android intermediário.
Fase 0 (Fundação) concluída em 2026-10-17 (tag `fase-0`); Fase 1 (MVP: Batalha) concluída em 2026-10-18 (tag `fase-1`): amigos jogaram 10 partidas seguidas sem bug grave. Progresso detalhado em [`docs/STATUS.md`](docs/STATUS.md).
