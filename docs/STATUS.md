# Onde parei

> **Leia isto primeiro ao começar uma sessão.** Reescrito ao fechar cada spec ou fase, no mesmo commit.

**Atualizado em:** 2026-10-17 · **Último commit de feature:** `2f5a7b2` (painel de debug + smoke Playwright)

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
| Deploy | **Pendente**: Vercel, precisa de OK do autor antes de publicar |

**Portão para a Fase 1:** "um jogador explode blocos rodando num celular real". **Ainda não cumprido.** No navegador e no e2e (viewport de celular) funciona; falta rodar num aparelho de verdade.

## Próximo passo

1. Colocar o jogo num celular real:
   - **Opção A:** deploy de preview na Vercel (pedir OK antes).
   - **Opção B:** `bun run dev --host` e ler no celular o QR code que o terminal mostra (mesma rede; acrescente `?debug=1`).
2. No aparelho, validar e ajustar no `game.json`:
   - joystick: zona morta 0,25, histerese 0,2, raio 60 px;
   - assistência de curva 0,5;
   - botão de bomba 88 px;
   - fps no painel (meta: 60).
3. Cumprido o portão: atualizar este arquivo e o "Fase atual" do CLAUDE.md, e planejar a Fase 1 em `docs/specs/` (bots, power-ups, terrenos, HUD/menus).

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
```

- Regras de cada feature: [`docs/specs/`](specs/README.md). Decisões e motivos: [`DECISIONS.md`](DECISIONS.md).
- Em dev, `window.__arena` expõe o mundo para inspeção no console (só leitura).
- `?seed=N` fixa o mapa; `?touch=1` força os controles de toque; `?debug=1` liga o painel.

## Ambiente conhecido

Windows 11, Bun 1.3, Node 24. TypeScript fixado em 6.x (typescript-eslint ainda não suporta o 7). Phaser 3.90, Vite 8, Vitest 5, Zod 4, Playwright com Chromium headless.
