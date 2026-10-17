# Onde parei

> **Leia isto primeiro ao começar uma sessão.** Reescrito ao fechar cada spec ou fase, no mesmo commit.

**Atualizado em:** 2026-10-17 · **Último commit de feature:** `2f5a7b2` (painel de debug + smoke Playwright) · **Repositório:** [maykon-oliveira/estouro-arena](https://github.com/maykon-oliveira/estouro-arena) (público)

## Fase 0 — Fundação (GDD §9): concluída em 2026-10-17

| Item da fase | Situação |
| --- | --- |
| Vite + Phaser 3 + TS strict, scripts bun | Feito |
| Testes | Feito: Vitest (113, core/dados/entrada/ui/áudio) + Playwright (3 smoke contra o build) |
| Grade e mapa | Feito: [spec](specs/grade-e-mapa.md) |
| Movimento + joystick | Feito: [movimento](specs/movimento.md), [controles de toque](specs/controles-touch.md) |
| Bomba e explosão em cruz | Feito: [spec](specs/bomba-e-explosao.md) |
| Placeholders | Feito com formas coloridas no código; ainda sem Kenney nem `manifest.json` |
| Painel de debug | Feito: [spec](specs/painel-debug.md); falta spawn de itens (não há itens ainda) |
| Deploy | Feito: Coolify, `Dockerfile` multi-stage (nginx, porta 80). No ar em <http://lzggua2mdcnabqzbieiprsdk.187.77.50.149.sslip.io/> (só HTTP por enquanto) |

**Portão para a Fase 1:** "um jogador explode blocos rodando num celular real". **Cumprido em 2026-10-17**: testado num celular de verdade via `bun run dev --host` + QR code.

## Próximo passo: Fase 1 — MVP: Batalha (specs prontas)

Escopo (GDD §9): 1 jogador vs 3 bots, melhor de 3, morte súbita; 8 power-ups, 2 montarias; terrenos água, mato, gelo, lama; 3 mapas; fantasma vingador; menus e HUD. Portão para a Fase 2: amigos jogam 10 partidas seguidas sem bug grave.

As 10 specs estão escritas e ordenadas em [`specs/README.md`](specs/README.md) (escopo decidido em [DECISIONS](DECISIONS.md), 2026-10-17).

1. **Começar pelo passo 1, [partida e rodadas](specs/partida-e-rodadas.md):** revisar a spec, escrever os testes do core, implementar, ligar o HUD mínimo. Remove `match.restartDelayMs`.
2. Seguir a ordem da tabela, uma feature por vez, no ciclo do CLAUDE.md; marcar cada spec como feita no commit dela.
3. Ajustes de controle no `game.json` (joystick, assistência de curva, botão de bomba) só se aparecer queixa; no teste no celular não houve.

**Para confirmar ao chegar no passo:** efeito do gelo sobre a bomba ([terrenos](specs/terrenos.md)); prioridade remota → montaria no botão de ação ([chute e remota](specs/chute-e-remota.md)).

## Pendências conhecidas

- Deploy só em HTTP (domínio sslip.io da Coolify). Ligar HTTPS (domínio próprio + Let's Encrypt) antes da PWA: service worker exige HTTPS.
- Assistência de curva pode deslizar lateralmente para dentro de uma bomba alheia (caso raro). Ver [movimento](specs/movimento.md).
- Sem `manifest.json` de tema: as cores dos placeholders estão em `src/render/ArenaScene.ts`. Criar quando entrarem sprites (Kenney/PixelLab).
- Sem botão de ação, vibração, gamepad e PWA (fases seguintes).
- Fase 0 reinicia a arena sozinha após a morte (`match.restartDelayMs`); substituir por fluxo de rodada na Fase 1.
- Perguntas em aberto do GDD §10 (estilo visual, dinâmicas-marca, multiplayer) seguem abertas.

## Como retomar

```bash
bun install
bunx playwright install chromium   # só na 1ª vez, para o e2e
bun run dev                        # http://localhost:5173/?debug=1&seed=0
bun run test && bun run lint && bun run build && bun run test:e2e
docker build -t estouro-arena . && docker run --rm -p 8080:80 estouro-arena   # imagem de produção
```

- Regras de cada feature: [`docs/specs/`](specs/README.md). Decisões e motivos: [`DECISIONS.md`](DECISIONS.md).
- Em dev, `window.__arena` expõe o mundo para inspeção no console (só leitura).
- `?seed=N` fixa o mapa; `?touch=1` força os controles de toque; `?debug=1` liga o painel.

## Ambiente conhecido

Windows 11, Bun 1.3, Node 24. TypeScript fixado em 6.x (typescript-eslint ainda não suporta o 7). Phaser 3.90, Vite 8, Vitest 5, Zod 4, Playwright com Chromium headless. Docker 28 (imagens `oven/bun:1.3.14-alpine` e `nginx:1.27-alpine`).
