# Controles de toque

**Status:** feita (commit 2a29abc; botão ligado à bomba em 5550d1f). GDD §2 (controles mobile), CLAUDE.md (Mobile).

## Regras

- Camada DOM (`#controls`) sobre o canvas, com tamanhos em **px de CSS**, para o tamanho físico não depender da escala FIT do Phaser.
- **Joystick flutuante** ([`VirtualJoystick`](../../src/input/VirtualJoystick.ts)) na metade esquerda:
  - Aparece onde o dedo toca; o pino segue o dedo, limitado a `joystickRadiusPx`.
  - Acompanha **um** `pointerId` só (o outro polegar não interfere); captura o ponteiro para seguir o dedo fora da zona.
  - Solta em `pointerup`, `pointercancel` e `blur` → direção `null`, base some.
- **Direção** ([`directionFromVector`](../../src/input/joystickMath.ts)): eixo dominante, em 4 direções. Abaixo de `joystickDeadZone × raio` → sem direção. **Histerese:** mantém a direção atual enquanto o eixo dela tem o mesmo sinal e o outro eixo não o supera por mais de `joystickHysteresis` (20%), para não tremer na diagonal.
- **Botão de bomba** à direita, `bombButtonPx` (88; mínimo 72 validado), a 24 px + `safe-area-inset` dos cantos. `pointerdown` → um pedido de bomba e estado visual "pressionado".
  - Aparece se `(pointer: coarse)`, com `?touch=1` ou no primeiro toque real.
- **Prioridade:** o joystick ativo vence o teclado; pedidos de bomba de qualquer fonte no mesmo quadro viram **um** comando `bomb`, emitido depois do `move`.
- Espaço também solta bomba (ignora auto-repeat).
- Retrato: aviso "gire o aparelho" (texto em `strings.pt-BR.json`) cobre tudo.

## Casos de borda

- Vetor nulo → sem direção, mesmo com direção atual.
- Inverter o sinal do eixo atual troca a direção na hora, sem histerese.
- `setPointerCapture` falha com ponteiros sintéticos (e2e) → segue sem captura.

## Eventos

Nenhum; gera `Command`s.

## Dados

`controls.joystickRadiusPx`, `joystickDeadZone`, `joystickHysteresis`, `bombButtonPx`; textos `controls.bomb`, `controls.joystick`, `rotate_warning`.

## Testes

[`tests/input/joystickMath.test.ts`](../../tests/input/joystickMath.test.ts), [`tests/input/PlayerInput.test.ts`](../../tests/input/PlayerInput.test.ts). A parte DOM foi verificada manualmente no navegador (viewport 812 × 375).

## Pendências

- Botão de ação (chutar/detonar/montaria) — quando houver ação.
- Vibração (Vibration API) — Fase 3.
- Validar tamanhos e zona morta num celular real.
