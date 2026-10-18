# Convenções de assets

## Regra principal

O código nunca referencia arquivos de imagem. Ele pede um **nome lógico** e o `manifest.json` do tema resolve para atlas + frames. Trocar a arte = trocar o tema.

```
assets/
  themes/
    default/
      manifest.json      # nome lógico → atlas + frames
      characters.png     # atlas (spritesheet)
      characters.json
      tiles.png
      tiles.json
      fx.png
      fx.json
    neon/                # tema alternativo, mesma estrutura
  avatars/               # SVGs do DiceBear (só estilos CC0)
```

## Texturas de terreno (DiceBear)

Enquanto não houver arte final, os tiles de terreno do tema `default` são SVGs do **DiceBear 10**, só estilos **CC0**, gerados no desenvolvimento — o jogo não chama a API nem carrega o DiceBear em tempo de execução.

- Fonte: `assets/themes/default/tiles.dicebear.json` (estilo, cores e nº de variações por terreno; lista de estilos CC0 permitidos).
- Gerar: `bun run tiles` → `assets/themes/default/tiles/<terreno>_<n>.svg` e as entradas `tile.<terreno>` do `manifest.json` (com `files` e `source`). Não edite os SVGs nem essas entradas à mão.
- O render escolhe a variação pela posição do tile (fixa, sem repetição visível).
- Créditos e licenças: `assets/themes/default/CREDITS.md`.

## Avatares dos personagens (DiceBear)

Um retrato por personagem, **DiceBear 10** estilo `pixel-art` (**CC0**), usado no DOM (escolha de personagem, placar do HUD, Resultado). Mesmo fluxo dos tiles:

- Fonte: `assets/themes/default/avatars.dicebear.json` (cores de pele, cabelo, chapéu e roupa por personagem, para lembrar cada um; lista de estilos CC0 permitidos).
- Gerar: `bun run avatars` → `assets/themes/default/avatars/<personagem>.svg` e as entradas `avatar.<personagem>` do `manifest.json`. Não edite à mão.
- Os dois geradores dividem `scripts/dicebear.ts` (render do SVG sem `<metadata>`, checagem CC0, atualização do manifest).

## Sprites da arena (SVG)

Arte provisória da arena, até a arte final (Fase 2, passo 9) — ver [`docs/specs/sprites-svg.md`](specs/sprites-svg.md):

- **Fichas dos jogadores** (`player.<personagem>`): o avatar DiceBear `pixel-art` em círculo (`avatars/<id>_token.svg`), gerado por `bun run avatars` (opções extras em `token` no `avatars.dicebear.json`). O render põe um anel na cor do lugar com um entalhe para onde o jogador está virado.
- **Montarias, itens e bomba** (`mount.<id>`, `item.<id>`, `bomb.default`): SVGs **originais**, desenhados à mão em `sprites/` (montarias 40 × 32, viradas para a direita; o resto 32 × 32). Estes podem ser editados à mão; mantenha o tamanho e registre no `manifest.json` com `source: "original"`.

Formato atual do manifest para tiles (o atlas do exemplo abaixo continua valendo para spritesheets futuros):

```json
{
  "tile.chao": { "files": ["tiles/chao_0.svg", "tiles/chao_1.svg"], "source": "dicebear:loops" }
}
```

Exemplo de `manifest.json`:

```json
{
  "player.saci.walk.down": { "atlas": "characters", "frames": "saci_walk_down_", "count": 4, "fps": 10 },
  "tile.agua_rasa":        { "atlas": "tiles", "frame": "agua_rasa", "animated": true },
  "fx.explosion":          { "atlas": "fx", "frames": "boom_", "count": 6, "fps": 18 }
}
```

## Nomes lógicos

`<categoria>.<id>.<ação>.<direção>` — partes opcionais conforme o caso.

- Categorias: `player`, `mount`, `enemy`, `boss`, `tile`, `item`, `bomb`, `fx`, `ui`, `portrait`.
- Ids iguais aos de `docs/PERSONAGENS.md` e do GDD (`saci`, `capivara`, `agua_rasa`).
- Ações: `idle`, `walk`, `place`, `die`, `win`, `skill`.
- Direções: `up`, `down`, `left`, `right`.

## Frames dentro do atlas

`<id>_<ação>_<direção>_<n>` com `n` começando em 0. Ex.: `saci_walk_down_0`.

## Tamanhos

| Tipo | Tamanho |
| --- | --- |
| Tile | 32 × 32 px |
| Personagem | 32 × 32 (pode ultrapassar 8 px para cima) |
| Personagem montado | 32 × 48 |
| Item | 32 × 32 |
| Retrato de menu | 128 × 128 |

Fundo transparente, PNG. Renderizar com `pixelArt: true` (sem suavização).

## Animações mínimas por personagem

`idle` (2 quadros), `walk` × 4 direções (4 quadros), `place` (2), `die` (6), `win` (4).

## Ferramentas

- Placeholders: Kenney (CC0) ou retângulos coloridos gerados em código.
- Arte final: PixelLab (MCP disponível) com o prompt base de `PERSONAGENS.md §5`.
- Empacotar atlas: free-tex-packer ou TexturePacker, formato JSON Hash do Phaser.
- Ajustes: Aseprite ou Pixelorama.

## Licenças

Registrar a origem e a licença de todo asset de terceiros em `assets/CREDITS.md`.
