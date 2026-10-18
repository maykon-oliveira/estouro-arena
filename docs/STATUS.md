# Onde parei

> **Leia isto primeiro ao começar uma sessão.** Reescrito ao fechar cada spec ou fase, no mesmo commit.

**Atualizado em:** 2026-10-18 · **Última feature:** [sprites em SVG na arena](specs/sprites-svg.md) (arte provisória, depois do passo 2 da Fase 2) · **Repositório:** [maykon-oliveira/estouro-arena](https://github.com/maykon-oliveira/estouro-arena) (público) · **No ar:** <http://lzggua2mdcnabqzbieiprsdk.187.77.50.149.sslip.io/> (Coolify, só HTTP)

## Fase atual: 2 — Arte e conteúdo (GDD §9)

Escopo: personagens com passiva, carga de energia e especiais, bombas elementais; campanha com 2 biomas de 6 fases e 1 chefe cada; sprites finais, tema visual e avatares DiceBear. **Portão para a Fase 3:** 60 fps num Android intermediário.

Ordem proposta dos 10 passos (escopo de cada um em [specs/README.md](specs/README.md)):

| # | Passo | Situação |
| --- | --- | --- |
| 1 | [Personagens e passivas](specs/personagens-e-passivas.md) | **Feito:** `src/core/characters.ts`, `src/data/characters.json` (6 do folclore), escolha na Batalha (`?personagem=`), bots sorteados, avatares DiceBear `pixel-art` (`bun run avatars`) no menu, HUD e Resultado |
| 2 | [Carga de energia e especiais](specs/carga-de-energia.md) | **Feito:** `src/core/specials.ts` (barra, os 6 especiais: Redemoinho, Encanto, Disparada, Rastro de fogo, Maré, Pegada falsa), botões separados remota/montaria/especial (`src/ui/controlsModel.ts`), teclas `K`/`J`/`L`, `+ energia` no debug, bots usam os especiais e caçam o clone |
| 3 | Bombas elementais | A escrever |
| 4 | Inimigos da campanha | A escrever |
| 5 | Estrutura da campanha | A escrever |
| 6 | Mundo Pantanal | A escrever |
| 7 | Mundo Tundra | A escrever |
| 8 | Chefes | A escrever |
| 9 | Arte final e tema visual | A escrever |
| 10 | Desempenho no celular | A escrever |

Fases concluídas: **Fase 0** (Fundação) em 2026-10-17, tag `fase-0` = `v0.1.0`; **Fase 1** (MVP: Batalha) em 2026-10-18, tag `fase-1` = `v0.12.0` + docs. O portão da Fase 1 foi cumprido: amigos jogaram 10 partidas seguidas sem bug grave. Os 10 passos dela estão em [specs/README.md](specs/README.md).

## Próximo passo: spec das bombas elementais (passo 3)

1. Responder com o autor a pergunta em aberto abaixo (quais elementos entram e como se pegam).
2. Escrever `docs/specs/bombas-elementais.md` (ciclo do CLAUDE.md): fogo (padrão), gelo (congela terreno e jogadores por 1 s), água (apaga mato, cria poça), vento (empurra tudo no raio), GDD §5; interação com os terrenos e com os bots.

### Perguntas em aberto da Fase 2

- **Arte final:** PixelLab (pago) tem orçamento? Se não, de onde vêm os sprites (Kenney CC0, DiceBear, desenho próprio)? Decide o passo 9 e o estilo visual (GDD §10).
- **Campanha:** qual é o objetivo de uma fase (derrotar todos os inimigos? achar a saída?), quantas vidas, como salvar o progresso.
- **Chefes:** a Cuca é o chefe final do último mundo (PERSONAGENS §3); quem são os chefes do Pantanal e da Tundra?
- **Bombas elementais:** quais entram (gelo, água, vento?) e como se pegam (item que troca o tipo da bomba?).

## Pendências conhecidas

- Deploy só em HTTP (domínio sslip.io da Coolify). Ligar HTTPS (domínio próprio + Let's Encrypt) antes da PWA: service worker exige HTTPS.
- Assistência de curva pode deslizar lateralmente para dentro de uma bomba alheia (caso raro). Ver [movimento](specs/movimento.md).
- Arte provisória: terreno DiceBear (`bun run tiles`), fichas dos jogadores com o avatar DiceBear (`bun run avatars`), montarias, itens e bomba em SVG original (`assets/themes/default/sprites/`). Sem animação de andar nem efeitos (chamas e maré são formas) até a arte final (passo 9).
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
- Testes: Vitest (317) + Playwright (15 smoke contra o build, viewport 812 × 375).
- Em dev, `window.__arena` expõe a partida (`Match`; o mundo da rodada em `.world`) para inspeção no console (só leitura).
- Sem parâmetros, o jogo abre no Título. Atalhos de dev/teste que pulam os menus: `?map=arena_01|pantanal_01|tundra_01`; `?seed=N` fixa o mapa da 1ª rodada; `?winsToWin=N`; `?bots=N` (1–3); `?nivel=facil|medio|dificil`; `?personagem=<id>` (saci, boitata, iara, curupira, boto, mula_sem_cabeca); `?ia=0` deixa os bots parados; `?roundMs=N` encurta a rodada (morte súbita nos últimos 30 s); `?touch=1` força os controles de toque; `?debug=1` liga o painel (com botões `+ <item>` e `+ energia`).
- Roteiros dos posts: `roteiros/` (fora do git), um por feature.

## Ambiente conhecido

Windows 11, Bun 1.3, Node 24. TypeScript fixado em 6.x (typescript-eslint ainda não suporta o 7). Phaser 3.90, Vite 8, Vitest 5, Zod 4, Playwright com Chromium headless. Docker 28 (imagens `oven/bun:1.3.14-alpine` e `nginx:1.27-alpine`).
