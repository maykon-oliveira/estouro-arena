# Changelog

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
