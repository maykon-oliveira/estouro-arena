# Mapas da Fase 1

**Status:** planejada (Fase 1, passo 6). GDD §4 (formato da fase, biomas). Depende de [terrenos](terrenos.md) e [itens](itens-e-power-ups.md).

## Regras

Três fases 15 × 13, retangulares, com anel de paredes na borda e 4 spawns nos cantos:

| Fase (`id`) | Bioma | Terrenos | Ideia |
| --- | --- | --- | --- |
| `arena_01` | `arena` | chão | Clássica: pilares em grade. Já existe; ganha `blocos.itens`. |
| `pantanal_01` | `pantanal` | água rasa, água funda, mato alto, lama | Rio de água funda no meio com 2 vaus de água rasa; touceiras de mato perto dos spawns; lama nas margens. |
| `tundra_01` | `tundra` | gelo, água funda, lama | Lago de gelo central (corredores escorregadios) com 2 buracos de água funda; lama como "freio" nas saídas. |

- **Legenda padrão** (cada fase repete na sua `legenda`): `#` parede, `.` chão, `P` spawn, `~` água rasa, `=` água funda, `"` mato alto, `*` gelo, `,` lama.
- **Ovos** entram no `blocos.itens` das fases a partir da spec de [montarias](montarias.md) (`pantanal_01` com mais ovos de capivara).
- **Escolha** da fase no menu de batalha; até lá, `?map=<id>`.

## Validação nova (schema/teste)

- Todo spawn tem os vizinhos da área segura andáveis em terreno que aceita bomba (o jogador consegue soltar a primeira bomba e se esconder).
- Os 4 spawns são ligados entre si por tiles andáveis, ignorando blocos quebráveis (ninguém nasce isolado por água funda ou parede).
- Fase com 4 spawns no mínimo (partida de 4).

## Casos de borda

- Área segura em volta do spawn cai sobre gelo ou água rasa → a validação acima rejeita a fase.
- Rio de água funda corta o mapa → a validação de ligação exige pelo menos um vau.

## Eventos

Nenhum.

## Dados

`src/data/maps/pantanal_01.json` e `tundra_01.json` (novos); `arena_01.json` com `blocos.itens`.

## Testes

- As 3 fases passam no schema e nas validações novas.
- Teste negativo: fase com spawn ilhado por água funda é rejeitada.
- Smoke (Playwright): cada fase carrega por `?map=` sem erro no console.

## Pendências

- Desenhar os ASCII definitivos e ajustar depois do playtest com bots.
- Mapas maiores com câmera e formas irregulares — fases seguintes.
