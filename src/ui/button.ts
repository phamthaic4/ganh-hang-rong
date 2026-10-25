import Phaser from 'phaser'

export interface ButtonStyle {
  width: number
  height: number
  fill: number
  fillDisabled?: number
  fontSize?: number
}

/** Nút chữ nhật cơ bản cho M3 (không dùng sprite/ảnh). */
export class Button {
  readonly bg: Phaser.GameObjects.Rectangle
  readonly label: Phaser.GameObjects.Text
  private readonly fill: number
  private readonly fillDisabled: number

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    style: ButtonStyle,
    onClick: () => void,
  ) {
    this.fill = style.fill
    this.fillDisabled = style.fillDisabled ?? 0x555555
    this.bg = scene.add
      .rectangle(x, y, style.width, style.height, this.fill)
      .setStrokeStyle(3, 0x1f1a15)
      .setInteractive({ useHandCursor: true })
    this.label = scene.add
      .text(x, y, text, {
        fontFamily: 'Arial, "Segoe UI", sans-serif',
        fontSize: `${style.fontSize ?? 20}px`,
        color: '#ffffff',
      })
      .setOrigin(0.5)
    this.bg.on('pointerdown', () => onClick())
  }

  setText(text: string): void {
    this.label.setText(text)
  }

  setEnabled(enabled: boolean): void {
    this.bg.setFillStyle(enabled ? this.fill : this.fillDisabled)
    this.bg.input!.enabled = enabled
    this.label.setAlpha(enabled ? 1 : 0.6)
  }

  setSelected(selected: boolean): void {
    this.bg.setStrokeStyle(selected ? 4 : 3, selected ? 0xf4e9d8 : 0x1f1a15)
  }

  destroy(): void {
    this.bg.destroy()
    this.label.destroy()
  }
}
