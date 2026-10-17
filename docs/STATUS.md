# Onde parei

> **Leia isto primeiro ao começar uma sessão.** Reescrito ao fechar cada spec ou fase, no mesmo commit.

**Atualizado em:** 2026-10-17 · **Último commit de feature:** `2f5a7b2` (painel de debug + smoke Playwright) · **Repositório:** [maykon-oliveira/estouro-arena](https://github.com/maykon-oliveira/estouro-arena) (público)

## Fase atual: 0 — Fundação (GDD §9)

| Item da fase | Situação |
| --- | --- |
| Vite + Phaser 3 + TS strict, scripts bun | Feito |
| Testes | Feito: Vitest (113, core/dados/entrada/ui/áudio) + Playwright (3 smoke contra o build) |
| Grade e mapa | Feito: [spec](specs/grade-e-mapa.md) |
| Movimento + joystick | Feito: [movimento](specs/movimento.md), [controles de toque](specs/controles-touch.md) |
| Bomba e explosão em cruz | Feito: [spec](specs/bomba-e-explosao.md) |
| Placeholders | Feito com formas coloridas no código; ainda sem Kenney nem `manifest.json` |
| Painel de debug | Feito: [spec](specs/painel-debug.md); falta spawn de itens (não há itens ainda) |
| Deploy | **Em andamento**: `Dockerfile` multi-stage pronto e testado localmente (imagem de ~50 MB, nginx na porta 80); falta criar a aplicação na Coolify |

**Portão para a Fase 1:** "um jogador explode blocos rodando num celular real". **Cumprido em 2026-10-17**: testado num celular de verdade via `bun run dev --host` + QR code.

## Próximo passo

1. Publicar na Coolify:
   - nova aplicação a partir do repositório público, branch `main`, build pack **Dockerfile**, porta **80**;
   - apontar um domínio e ligar HTTPS (Let's Encrypt), necessário para a PWA depois;
   - abrir no celular pela URL pública e conferir.
2. Ajustes finos no aparelho, se preciso, no `game.json` (zona morta do joystick 0,25, histerese 0,2, raio 60 px; assistência de curva 0,5; botão de bomba 88 px). No primeiro teste não houve queixa.
3. Fechar a Fase 0 (atualizar este arquivo e o "Fase atual" do CLAUDE.md) e planejar a Fase 1 em `docs/specs/` (bots, power-ups, terrenos, HUD/menus).

## Pendências conhecidas

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
