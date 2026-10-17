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
