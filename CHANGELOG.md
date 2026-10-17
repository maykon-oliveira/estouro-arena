# Changelog

## [0.12.0](https://github.com/maykon-oliveira/estouro-arena/compare/v0.11.0...v0.12.0) (2026-10-17)

### Funcionalidades

* **tema-dicebear:** Adiciona texturas de terreno geradas com DiceBear ([c3c8f22](https://github.com/maykon-oliveira/estouro-arena/commit/c3c8f2263069b58ecd942aa6a7a0ac1218ee3abe))

## [0.11.0](https://github.com/maykon-oliveira/estouro-arena/compare/v0.10.0...v0.11.0) (2026-10-17)

### Funcionalidades

* **menus-e-hud:** Adiciona título, batalha, pausa, resultado e painel do jogador ([20f074c](https://github.com/maykon-oliveira/estouro-arena/commit/20f074cce4f849d83e744b87e33c698158710095))

## [0.10.0](https://github.com/maykon-oliveira/estouro-arena/compare/v0.9.0...v0.10.0) (2026-10-17)

### Funcionalidades

* **fantasma-vingador:** Adiciona o fantasma vingador na borda da arena ([d35cedf](https://github.com/maykon-oliveira/estouro-arena/commit/d35cedf60af2f7081538f714a3bd943e389e65a6))

## [0.9.0](https://github.com/maykon-oliveira/estouro-arena/compare/v0.8.0...v0.9.0) (2026-10-17)

### Funcionalidades

* **morte-subita:** Adiciona morte súbita em espiral nos últimos 30 s ([4c587a4](https://github.com/maykon-oliveira/estouro-arena/commit/4c587a41d0912846a20ba70c0c7c76df23b952eb))

## [0.8.0](https://github.com/maykon-oliveira/estouro-arena/compare/v0.7.0...v0.8.0) (2026-10-17)

### Funcionalidades

* **montarias:** Adiciona capivara e sapo-saltador com ovos e escudo ([f3807d2](https://github.com/maykon-oliveira/estouro-arena/commit/f3807d2fa859dc34c5cc1f6b90e8adafb06a47a1))

## [0.7.0](https://github.com/maykon-oliveira/estouro-arena/compare/v0.6.0...v0.7.0) (2026-10-17)

### Funcionalidades

* **mapas-fase-1:** Adiciona pantanal e tundra, validação de fase e ?map= ([df8a360](https://github.com/maykon-oliveira/estouro-arena/commit/df8a3608464867309377fd940a3ffd0a29cbe0e9))

## [0.6.0](https://github.com/maykon-oliveira/estouro-arena/compare/v0.5.0...v0.6.0) (2026-10-17)

### Funcionalidades

* **terrenos:** Adiciona água rasa e funda, mato alto, gelo e lama ([d097eb6](https://github.com/maykon-oliveira/estouro-arena/commit/d097eb6b684d244c782ab5b58353eea60bc7fd35))

## [0.5.0](https://github.com/maykon-oliveira/estouro-arena/compare/v0.4.0...v0.5.0) (2026-10-17)

### Funcionalidades

* **chute-e-remota:** Adiciona chute, bomba remota e botão de ação ([a27cedc](https://github.com/maykon-oliveira/estouro-arena/commit/a27cedcf098a116d531cba9cfafb7dd94b6a536d))

## [0.4.0](https://github.com/maykon-oliveira/estouro-arena/compare/v0.3.0...v0.4.0) (2026-10-17)

### Funcionalidades

* **itens-e-power-ups:** Adiciona itens nos blocos e 6 power-ups ([a435b9b](https://github.com/maykon-oliveira/estouro-arena/commit/a435b9b9070edc38f01b345a7da5d591c90375df))

## [0.3.0](https://github.com/maykon-oliveira/estouro-arena/compare/v0.2.0...v0.3.0) (2026-10-17)

### Funcionalidades

* **bots:** Adiciona bots com mapa de perigo, rotas e 3 níveis ([2f77653](https://github.com/maykon-oliveira/estouro-arena/commit/2f776530767e4f19ef96d216881d429ceaa359ed))

## [0.2.0](https://github.com/maykon-oliveira/estouro-arena/compare/v0.1.0...v0.2.0) (2026-10-17)

### Funcionalidades

* **partida-e-rodadas:** Adiciona partida melhor de 3 com rodadas, contagem e HUD ([de39842](https://github.com/maykon-oliveira/estouro-arena/commit/de39842fe89f627769b58ad871271062b8135922))

### Documentação

* Adiciona roteiros dos posts ao ciclo por feature ([b7bac9b](https://github.com/maykon-oliveira/estouro-arena/commit/b7bac9b8f9cde65712e17af7cad5622b296b695f))

## 0.1.0 (2026-10-17) — Fase 0: Fundação

Tag da fase: `fase-0`. Versão escrita à mão: os commits da Fase 0 são anteriores ao Conventional Commits. Daqui em diante o `semantic-release` gera as entradas.

### Funcionalidades

- **dados-e-schemas:** terrenos e config do jogo em JSON validados com Zod (0a5d5e3)
- **grade-e-mapa:** grade e geração do mapa com seed, blocos por densidade e área segura nos spawns (ca560d2)
- **movimento:** loop de simulação com passo fixo, comandos e movimento com assistência de curva (1f2831d)
- **controles-touch:** joystick virtual flutuante e botão de bomba (2a29abc)
- **bomba-e-explosao:** bomba com pavio, explosão em cruz e reação em cadeia (5550d1f)
- **painel-debug:** painel `?debug=1` e smoke test no Playwright (2f5a7b2)
- **dev:** QR code no terminal para abrir o servidor de dev no celular (e11b770)
- **deploy:** Dockerfile multi-stage e deploy na Coolify (0455958, 7cadfd9)

### Specs e design

- CLAUDE.md, GDD e documentação inicial (d294f8d)
- Specs das features em `docs/specs` (0f4b3c7)
- `docs/STATUS.md` e regra de fechar a documentação (7f838f9)
