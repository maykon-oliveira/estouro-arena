import type Phaser from 'phaser';

/**
 * Imagens reaproveitadas a cada quadro (itens, bombas, clones): `begin`, um `place` por coisa
 * visível, `end` esconde as que sobraram. Só cria imagem nova quando precisa de mais que nunca.
 */
export class SpritePool {
  private readonly images: Phaser.GameObjects.Image[] = [];
  private used = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depth: number,
  ) {}

  begin(): void {
    this.used = 0;
  }

  /** Mostra a textura `key` centrada em (x, y), com tamanho em px e transparência. */
  place(key: string, x: number, y: number, width: number, height = width, alpha = 1): void {
    let image = this.images[this.used];
    if (!image) {
      image = this.scene.add.image(0, 0, key).setDepth(this.depth);
      this.images.push(image);
    }
    this.used++;
    if (image.texture.key !== key) image.setTexture(key);
    image.setPosition(x, y).setDisplaySize(width, height).setAlpha(alpha).setVisible(true);
  }

  end(): void {
    for (let i = this.used; i < this.images.length; i++) this.images[i]?.setVisible(false);
  }
}
