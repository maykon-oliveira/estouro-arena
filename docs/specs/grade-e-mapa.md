# Grade e mapa

**Status:** feita (commit ca560d2). GDD §4.

## Regras

- Uma fase é um JSON em `src/data/maps/` no formato do GDD: `id`, `bioma`, `tamanho [cols, rows]`, `legenda` (caractere → id de terreno ou `spawn`), `mapa` (linhas ASCII), `blocos.densidade` (0–1); `blocos.itens` e `musica` opcionais.
- `generateGrid(mapa, rng, spawnSafeRadius)` ([`src/core/grid.ts`](../../src/core/grid.ts)):
  1. Converte o ASCII em ids de terreno; `spawn` vira `chao` e entra em `grid.spawns` (ordem de leitura: linha a linha).
  2. Para cada tile `chao` fora da área segura, sorteia `bloco` com probabilidade `densidade`.
- **Área segura:** tiles a distância Manhattan ≤ `map.spawnSafeRadius` (padrão 1) de algum spawn nunca recebem bloco. Com raio 1 o jogador do canto consegue soltar a primeira bomba ao lado e se esconder no outro vizinho.
- Determinístico: mesma seed → mesma grade. O RNG é consumido em todo tile elegível, independentemente da densidade.
- Helpers: `inBounds`, `tileAt` (fora → `undefined`), `setTile`.

## Validação do mapa (schema)

- Número de linhas = `tamanho[1]`; cada linha com `tamanho[0]` colunas.
- Todo caractere existe na legenda; toda legenda aponta para terreno existente ou `spawn`.
- Pelo menos 1 spawn.

## Casos de borda

- Blocos só nascem sobre `chao` (nunca sobre água, lama etc.).
- Densidade 0 → nenhum bloco; densidade 1 → todo `chao` elegível vira bloco.

## Eventos

Nenhum.

## Testes

[`tests/core/grid.test.ts`](../../tests/core/grid.test.ts), [`tests/data/maps.test.ts`](../../tests/data/maps.test.ts).

## Pendências

- ~~Itens escondidos nos blocos (`blocos.itens`)~~: feito em [itens e power-ups](itens-e-power-ups.md).
- Mapas maiores com câmera e formas irregulares (`vazio`).
