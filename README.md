# Estouro Arena

Jogo de arena com bombas em grade para navegador mobile (paisagem), com personagens do folclore brasileiro, montarias da fauna nacional e terrenos que mudam a estratégia.

Projeto IA-first: o desenvolvimento é feito com agentes de IA seguindo [`CLAUDE.md`](CLAUDE.md).

## Documentação

- [Documento de design (GDD)](docs/GDD.md)
- [Personagens e montarias](docs/PERSONAGENS.md)
- [Convenções de assets](docs/ASSETS.md)
- [Decisões](docs/DECISIONS.md)
- [Specs por feature](docs/specs/README.md)
- [Onde parei (status)](docs/STATUS.md)

## Status

Fase 0 — Fundação, quase concluída: grade, movimento com joystick, bomba e explosão em cruz e painel de debug funcionando. Falta validar num celular real. Detalhes em [docs/STATUS.md](docs/STATUS.md).

```bash
bun install
bun run dev   # http://localhost:5173/?debug=1
```
