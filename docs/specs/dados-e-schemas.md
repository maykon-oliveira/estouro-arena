# Dados e schemas

**Status:** feita (commit 0a5d5e3; ampliada nos passos seguintes).

## Regras

- Todo conteúdo e balanceamento vive em `src/data/*.json` e passa por um schema Zod em [`src/data/schemas.ts`](../../src/data/schemas.ts) na carga ([`src/data/index.ts`](../../src/data/index.ts)).
- Schemas são **estritos** (`strictObject`): campo desconhecido é erro, para pegar erro de digitação.
- Falha de validação lança erro com o arquivo e o caminho do campo (`Dados inválidos em src/data/game.json: … tickRate`).
- Ids de conteúdo em snake_case português (`agua_rasa`); propriedades em inglês (`walkable`).
- Durações ficam em **ms** no JSON; a simulação recebe **ticks** (`msToTicks`, arredondando) via [`rulesFromConfig`](../../src/data/rules.ts).

## Arquivos

| Arquivo | Conteúdo | Validações extras |
| --- | --- | --- |
| `terrains.json` | lista de terrenos: `walkable`, `blocksFire`, `destructible`, `allowsBomb`, `speedMultiplier` (0–3) | ids únicos; `chao`, `parede` e `bloco` obrigatórios |
| `game.json` | `tickRate`, `maxTicksPerFrame`, `map`, `match`, `bomb`, `player`, `controls`, `render` | durações de bomba ≥ 1 tick; `bombButtonPx` ≥ 72 (GDD) |
| `maps/*.json` | fases (ver [grade-e-mapa](grade-e-mapa.md)) | legenda contra terrenos existentes |
| `sounds.json` | evento → id do som (parcial) | chave tem que ser um tipo de evento conhecido |
| `strings.pt-BR.json` | chave → texto, lido por `t(chave)` | chave tipada a partir do JSON |

## Casos de borda

- Pavio que arredonda para 0 tick (ex.: 5 ms a 60/s) → rejeitado.
- `map.default` apontando para fase inexistente → erro na carga.
- Terreno referenciado pelo motor ausente do JSON → rejeitado.

## Testes

[`tests/data/`](../../tests/data/): `schemas.test.ts`, `maps.test.ts`, `index.test.ts`, `rules.test.ts`; [`tests/core/time.test.ts`](../../tests/core/time.test.ts).

## Pendências

- Schemas de itens, personagens e montarias entram com cada feature.
