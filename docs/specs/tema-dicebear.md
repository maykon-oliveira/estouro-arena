# Texturas de terreno com DiceBear

**Status:** feita (arte provisória, entre a Fase 1 e o portão). GDD §6 (arte e assets), [ASSETS.md](../ASSETS.md), CLAUDE.md (DiceBear 10).

O PixelLab é pago; enquanto não houver arte final, os tiles de terreno saem do **DiceBear 10**, só com estilos **CC0**, gerados uma vez (no desenvolvimento) e versionados como SVG. O jogo não chama a API nem carrega o DiceBear em tempo de execução.

## Regras

- **Fonte:** `assets/themes/default/tiles.dicebear.json` diz, para cada terreno, o estilo DiceBear, as opções (cores na paleta dos placeholders) e quantas variações gerar.
- **Geração:** `bun run tiles` roda `scripts/generate-tiles.ts` com `@dicebear/core` + `@dicebear/styles` (DiceBear 10, núcleo JavaScript: o projeto é TypeScript). Para cada terreno e variação `n`, seed `<terreno>-<n>`, tamanho 32 → `assets/themes/default/tiles/<terreno>_<n>.svg`. Atualiza as entradas `tile.<terreno>` do `assets/themes/default/manifest.json` (as outras entradas ficam).
- **Escolha por terreno** (todos CC0):

| Terreno | Estilo | Por quê |
| --- | --- | --- |
| `chao` | `loops` | rabiscos orgânicos: grama que emenda bem |
| `parede` | `patchwork` | geometria de alvenaria |
| `bloco` | `squircles` | bloco em relevo, bem diferente da parede |
| `agua_rasa` | `loops` (claro) | ondinhas |
| `agua_funda` | `waves` | água funda em camadas |
| `mato_alto` | `stripes` | lâminas de capim |
| `gelo` | `glass` | superfície lisa e brilhante |
| `lama` | `blobs` | torrões moles |

- **Nome lógico** (regra 4 do CLAUDE.md): o render pede `tile.<terreno>`; o manifest resolve para a lista de arquivos (`files`). Nenhum caminho de arquivo no código do jogo.
- **Variação:** cada tile usa a variação `hash(x, y) mod n` — fixa por posição (o mapa não "pisca" ao redesenhar), sem padrão repetido visível.
- **SVG limpo:** o gerador tira o bloco `<metadata>` (tem aspas curvas, fora do Latin-1, que quebram o carregador do Phaser) e o Vite não embute SVG como data URI (`assetsInlineLimit`).
- **Render:** a cena carrega os SVGs como texturas de 32 × 32 (uma vez por chave) e desenha a grade numa `RenderTexture`, redesenhada só quando um tile muda (bloco destruído, mato queimado, morte súbita). Terreno sem textura no manifest cai na cor de placeholder.
- **Validação:** teste garante que todo terreno de `terrains.json` tem `tile.<id>` no manifest e que os arquivos existem; o manifest passa por um schema Zod.
- **Créditos:** `assets/themes/default/CREDITS.md` lista os estilos usados e a licença (CC0 1.0).

## Casos de borda

- Estilo que não é CC0 → não entra (o gerador recusa estilos fora da lista CC0 do arquivo de fonte).
- Gerar de novo com as mesmas opções → os mesmos SVGs (DiceBear é determinístico pela seed).

## Eventos

Nenhum.

## Dados

`assets/themes/default/tiles.dicebear.json`, `assets/themes/default/manifest.json`, `assets/themes/default/tiles/*.svg`.

## Testes

[`tests/render/theme.test.ts`](../../tests/render/theme.test.ts):

- Manifest válido no schema; todo terreno com textura; arquivos existem; só estilos CC0.
- Variação por posição é determinística e fica em `[0, n)`.
- Conferência visual (Playwright headless, 812 × 375, e 2× de zoom): as três fases; contraste do chão e da lama aumentado depois da primeira conferência.

## Pendências

- Itens, bombas, jogadores e montarias continuam formas coloridas.
- Arte final (PixelLab ou outra) substitui o tema sem mudar o código, só o manifest.
