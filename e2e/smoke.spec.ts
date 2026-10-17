import { expect, test, type Page } from '@playwright/test';

/** Coleta erros de página e de console durante o teste. */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

/** Lê um valor do painel de debug (atributos data-* de .debug-panel). */
async function debugValue(page: Page, key: string): Promise<string> {
  return (await page.locator('.debug-panel').getAttribute(`data-${key}`)) ?? '';
}

async function holdKey(page: Page, key: string, ms: number): Promise<void> {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

test('carrega em paisagem sem erros, com canvas e botão de bomba', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.locator('#game canvas')).toBeVisible();
  await expect(page.locator('.bomb-button')).toBeVisible();
  await expect(page.locator('#rotate-warning')).toBeHidden();
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

test('em retrato mostra o aviso de girar o aparelho', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page.locator('#rotate-warning')).toBeVisible();
  await expect(page.locator('#rotate-warning')).toHaveText('Gire o aparelho para jogar');
});

test('portão da Fase 0: o jogador explode um bloco e sobrevive', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=0&debug=1');
  // Espera o fim da contagem ("3, 2, 1, Já!") e a simulação começar a rodar.
  await expect(page.locator('.match-hud')).toHaveAttribute('data-phase', 'playing', {
    timeout: 6_000,
  });
  await expect.poll(async () => Number(await debugValue(page, 'tick'))).toBeGreaterThan(5);
  const blocksBefore = Number(await debugValue(page, 'blocks'));

  // Seed 0: spawn em (1,1), chão em (2,1), bloco em (3,1) e chão em (1,2).
  // Bomba em (2,1) e esconderijo em (1,2), fora da cruz.
  await holdKey(page, 'ArrowRight', 350);
  await expect.poll(() => debugValue(page, 'tile')).toBe('2,1');
  await page.keyboard.press('Space');
  await expect.poll(() => debugValue(page, 'bombs')).toBe('1/1');
  await holdKey(page, 'ArrowLeft', 350);
  await holdKey(page, 'ArrowDown', 300);
  await expect.poll(() => debugValue(page, 'tile')).toBe('1,2');

  await expect
    .poll(async () => Number(await debugValue(page, 'blocks')), { timeout: 6_000 })
    .toBeLessThan(blocksBefore);
  expect(await debugValue(page, 'alive')).toBe('vivo');
  expect(errors).toEqual([]);
});

test('partida: contagem, "Já!" e relógio correndo', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=0');
  const hud = page.locator('.match-hud');
  await expect(hud).toHaveAttribute('data-phase', 'countdown');
  await expect(hud).toHaveAttribute('data-round', '1');
  await expect(page.locator('.hud-banner-sub')).toHaveText('Rodada 1');
  await expect(page.locator('.hud-clock')).toHaveText('2:00');
  await expect(page.locator('.hud-score')).toHaveCount(4);

  await expect(hud).toHaveAttribute('data-phase', 'playing', { timeout: 6_000 });
  await expect(page.locator('.hud-banner-text')).toHaveText('Já!');
  await expect(page.locator('.hud-clock')).toHaveText('1:59', { timeout: 3_000 });
  expect(errors).toEqual([]);
});
