# Onde parei

> **Leia isto primeiro ao começar uma sessão.** Reescrito ao fechar cada spec ou fase, no mesmo commit.

**Atualizado em:** 2026-10-17 · **Última feature:** [texturas de terreno com DiceBear](specs/tema-dicebear.md) (depois do passo 10 da Fase 1) · **Repositório:** [maykon-oliveira/estouro-arena](https://github.com/maykon-oliveira/estouro-arena) (público) · **No ar:** <http://lzggua2mdcnabqzbieiprsdk.187.77.50.149.sslip.io/> (Coolify, só HTTP)

## Fase atual: 1 — MVP: Batalha (GDD §9)

Escopo: 1 jogador vs 3 bots, melhor de 3, morte súbita; 8 power-ups, 2 montarias; terrenos água, mato, gelo, lama; 3 mapas; fantasma vingador; menus e HUD. **Portão para a Fase 2:** amigos jogam 10 partidas seguidas sem bug grave.

| # | Passo ([ordem e specs](specs/README.md)) | Situação |
| --- | --- | --- |
| 1 | [Partida e rodadas](specs/partida-e-rodadas.md) | **Feito:** `src/core/match.ts`, HUD mínimo (`src/ui/MatchHud.ts`), toque/Enter recomeça no fim |
| 2 | [Bots](specs/bots.md) | **Feito:** `src/core/bots/` (mapa de perigo, rotas, decisões), 3 níveis em `src/data/bots.json`, `?nivel=` |
| 3 | [Itens e power-ups](specs/itens-e-power-ups.md) | **Feito:** `src/core/items.ts`, `src/data/items.json` (6 itens), coleta, perfurante, atravessar blocos, bots buscam itens, `+ item` no painel de debug |
| 4 | [Chute, remota e botão de ação](specs/chute-e-remota.md) | **Feito:** `src/core/kick.ts`, remota (`action` detona a mais antiga), botão de ação no toque e `Shift`/`K`, bots detonam remotas |
| 5 | [Terrenos: água, mato, gelo, lama](specs/terrenos.md) | **Feito:** 5 terrenos em `terrains.json` (`hides`, `slippery`), mato queima, deslize no gelo, bots no gelo e no mato; ainda sem fase que os use |
| 6 | [Mapas da Fase 1](specs/mapas-fase-1.md) | **Feito:** `pantanal_01`, `tundra_01`, `arena_01` com itens, `?map=`, `checkMapLayout` na carga; bots 20/20 nas três fases |
| 7 | [Montarias: capivara e sapo](specs/montarias.md) | **Feito:** `src/core/mounts.ts`, `src/data/mounts.json`, ovos, escudo, capivara na água, pulo do sapo no `action`, bots com ovos/capivara/pulo de fuga |
| 8 | [Morte súbita](specs/morte-subita.md) | **Feito:** `src/core/suddenDeath.ts` (espiral nos últimos 30 s, `world.collapse`), aviso no HUD, tiles piscando, bots recuam; partidas entre bots agora terminam |
| 9 | [Fantasma vingador](specs/fantasma-vingador.md) | **Feito:** `src/core/ghost.ts` (anel, arremesso, voo), bots fantasmas, bomba no ar no mapa de perigo |
| 10 | [Menus e HUD](specs/menus-e-hud.md) | **Feito:** Título → Batalha → Partida → Pausa/Resultado em DOM, escolha salva, painel do jogador, arena abaixo do HUD |

Fase 0 (Fundação) concluída em 2026-10-17: tag `fase-0` = `v0.1.0`.

## Próximo passo: portão da Fase 1

Os 10 passos estão feitos. **Portão para a Fase 2:** amigos jogam 10 partidas seguidas sem bug grave.

1. Publicar a versão atual (o push na `main` gera a release; conferir se a Coolify fez o deploy da `main` nova) e jogar no celular, pelo fluxo normal: Título → Batalha → Começar.
2. Chamar amigos para 10 partidas seguidas. Anotar cada bug (o que aconteceu, fase, seed — o `?debug=1` mostra a seed) e corrigir os graves, um commit `fix(<spec>)` por bug, com teste.
3. Cumprido o portão: tag anotada `fase-1` no commit que fecha a fase (`git tag -a fase-1 -m "Fase 1 — MVP: Batalha" && git push origin fase-1`), reescrever este arquivo e o "Fase atual" do CLAUDE.md, e planejar a Fase 2 (arte PixelLab, tema, campanha) em `docs/specs/`.
4. Roteiro do fechamento da fase: `roteiros/post-40-…` (recap da Fase 1, como o 28 foi para a Fase 0).

## Pendências conhecidas

- Deploy só em HTTP (domínio sslip.io da Coolify). Ligar HTTPS (domínio próprio + Let's Encrypt) antes da PWA: service worker exige HTTPS.
- Assistência de curva pode deslizar lateralmente para dentro de uma bomba alheia (caso raro). Ver [movimento](specs/movimento.md).
- Terreno com texturas DiceBear pelo `manifest.json` do tema (`bun run tiles`); jogadores, itens, bombas e montarias ainda são formas coloridas em `src/render/ArenaScene.ts`.
- Os PNGs do PixelLab que uma sessão paralela gerou em `assets/themes/default/` entraram por engano no commit da morte súbita e depois foram apagados da pasta por aquela sessão; o apagamento **não** foi commitado (decidir: `git rm` ou restaurar). Criar quando entrarem sprites (Kenney/PixelLab).
- Bots ainda não usam o chute para fugir (pendência em [chute e remota](specs/chute-e-remota.md)).
- Sem vibração, gamepad e PWA (fases seguintes).
- Perguntas em aberto do GDD §10 (estilo visual, dinâmicas-marca, multiplayer) seguem abertas.

## Como retomar

```bash
bun install
bunx playwright install chromium   # só na 1ª vez, para o e2e
bun run dev                        # http://localhost:5173/?debug=1&seed=0
bun run test && bun run lint && bun run build && bun run test:e2e
docker build -t estouro-arena . && docker run --rm -p 8080:80 estouro-arena   # imagem de produção
```

- Commits: `feat(<spec>): Assunto` (ver CLAUDE.md, passo 8); o push na `main` gera a versão e o `CHANGELOG.md` sozinho. Fase fechada = tag `fase-N`.
- Regras de cada feature: [`docs/specs/`](specs/README.md). Decisões e motivos: [`DECISIONS.md`](DECISIONS.md).
- Testes: Vitest (258) + Playwright (14 smoke contra o build, viewport 812 × 375).
- Em dev, `window.__arena` expõe a partida (`Match`; o mundo da rodada em `.world`) para inspeção no console (só leitura).
- Sem parâmetros, o jogo abre no Título. Atalhos de dev/teste que pulam os menus: `?map=arena_01|pantanal_01|tundra_01`; `?seed=N` fixa o mapa da 1ª rodada; `?winsToWin=N`; `?bots=N` (1–3); `?nivel=facil|medio|dificil`; `?ia=0` deixa os bots parados; `?roundMs=N` encurta a rodada (morte súbita nos últimos 30 s); `?touch=1` força os controles de toque; `?debug=1` liga o painel (com botões `+ <item>`).
- Roteiros dos posts: `roteiros/` (fora do git), um por feature.

## Ambiente conhecido

Windows 11, Bun 1.3, Node 24. TypeScript fixado em 6.x (typescript-eslint ainda não suporta o 7). Phaser 3.90, Vite 8, Vitest 5, Zod 4, Playwright com Chromium headless. Docker 28 (imagens `oven/bun:1.3.14-alpine` e `nginx:1.27-alpine`).
