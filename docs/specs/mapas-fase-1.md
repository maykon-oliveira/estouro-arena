# Mapas da Fase 1

**Status:** feita (Fase 1, passo 6). GDD §4 (formato da fase, biomas). Depende de [terrenos](terrenos.md) e [itens](itens-e-power-ups.md).

## Regras

Três fases 15 × 13, retangulares, com anel de paredes na borda e 4 spawns nos cantos:

| Fase (`id`) | Bioma | Terrenos | Ideia |
| --- | --- | --- | --- |
| `arena_01` | `arena` | chão | Clássica: pilares em grade. Já existe; ganha `blocos.itens`. |
| `pantanal_01` | `pantanal` | água rasa, água funda, mato alto, lama | Rio de água funda no meio com 2 vaus de água rasa; touceiras de mato perto dos spawns; lama nas margens. |
| `tundra_01` | `tundra` | gelo, água funda, lama | Lago de gelo central (corredores escorregadios) com 2 buracos de água funda; lama como "freio" nas saídas. |

- **Legenda padrão** (cada fase repete na sua `legenda`): `#` parede, `.` chão, `P` spawn, `~` água rasa, `=` água funda, `"` mato alto, `*` gelo, `,` lama.
- **Ovos** entram no `blocos.itens` das fases a partir da spec de [montarias](montarias.md) (`pantanal_01` com mais ovos de capivara).
- **Escolha** da fase no menu de batalha; até lá, `?map=<id>` (id desconhecido → `map.default`).
- **Itens:** `arena_01` traz `blocos.itens` igual à distribuição padrão; `pantanal_01` também, com 2 ovos de capivara; `tundra_01` usa a padrão (1 ovo de cada).
- **Densidade de blocos:** `arena_01` 0,6; `pantanal_01` 0,5 e `tundra_01` 0,55 (os terrenos já ocupam espaço; blocos só nascem em `chao`).

## Validação nova (na carga dos dados)

`checkMapLayout` ([`src/core/mapCheck.ts`](../../src/core/mapCheck.ts)) roda sobre toda fase em `src/data/maps/` ao carregar; qualquer erro impede o jogo de abrir, com a fase e o motivo:

- Pelo menos 4 spawns (partida de 4).
- **Área segura jogável:** os tiles andáveis a até `map.spawnSafeRadius` de cada spawn (Manhattan) aceitam bomba e não escorregam, e são pelo menos 3 (o spawn + 2): dá para soltar a primeira bomba ao lado e se esconder no outro vizinho.
- **Spawns ligados:** todos no mesmo componente, andando por tiles andáveis ou destrutíveis (blocos e mato contam como passagem, porque serão quebrados) — ninguém nasce isolado por água funda ou parede.

## Casos de borda

- Área segura em volta do spawn cai sobre gelo ou água rasa → a validação acima rejeita a fase.
- Rio de água funda corta o mapa → a validação de ligação exige pelo menos um vau.

## Eventos

Nenhum.

## Dados

`src/data/maps/pantanal_01.json` e `tundra_01.json` (novos); `arena_01.json` com `blocos.itens`.

## Testes

[`tests/core/mapCheck.test.ts`](../../tests/core/mapCheck.test.ts), [`tests/core/bots.test.ts`](../../tests/core/bots.test.ts), [`e2e/smoke.spec.ts`](../../e2e/smoke.spec.ts):

- `checkMapLayout`: aceita o mapa bom; rejeita < 4 spawns, área segura com gelo/água rasa, área segura apertada e spawn isolado por água funda; blocos e mato contam como passagem.
- As 3 fases reais existem, passam na checagem e usam os terrenos do bioma; `arena_01` com `blocos.itens` = distribuição padrão.
- Bot difícil sozinho sobrevive 60 s em ≥ 90 % das seeds **em cada uma das 3 fases** (medido: 20/20 nas três).
- Smoke: `?map=pantanal_01` e `?map=tundra_01` carregam sem erro.
- Conferência visual (Playwright headless, 812 × 375): rio, vaus, lama e touceiras no pantanal; gelo com brilho, buracos e lama na tundra; bots deslizando no gelo; jogador local meio transparente e bot invisível no mato.

## Bots nas fases novas

Rodar os bots nas fases novas achou três falhas, corrigidas aqui (ver [bots](bots.md)):

- A rota a partir da posição atual ignorava o deslize no gelo: o primeiro passo agora só segue na direção do deslize (`Mover.slide`).
- Ao detonar a remota e soltar outra bomba na mesma decisão, a checagem de fuga não contava as remotas detonadas: agora conta (`detonating`).
- O bot não detona enquanto desliza no gelo (não controla para onde vai).

## Pendências

- Desenhar os ASCII definitivos e ajustar depois do playtest com bots.
- Mapas maiores com câmera e formas irregulares — fases seguintes.
