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

Fase 0 — Fundação, concluída: grade, movimento com joystick, bomba e explosão em cruz e painel de debug, testados num celular real. Publicado em http://lzggua2mdcnabqzbieiprsdk.187.77.50.149.sslip.io/ (Coolify). Fase 1 — MVP: Batalha, concluída: partida melhor de 3 contra bots em 3 fases — arena, pantanal e tundra —, com power-ups, chute, bomba remota e montarias — capivara e sapo —, morte súbita e fantasma vingador; amigos jogaram 10 partidas seguidas sem bug grave. Fase 2 — Arte e conteúdo em andamento: os 6 personagens do folclore, cada um com sua passiva e seu especial (barra de energia), já são escolhidos na Batalha; faltam bombas elementais, campanha e arte final. Detalhes em [docs/STATUS.md](docs/STATUS.md).

```bash
bun install
bun run dev   # http://localhost:5173/?debug=1
```
