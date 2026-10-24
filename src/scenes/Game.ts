import Phaser from 'phaser'

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game')
  }

  create(): void {
    this.add
      .text(640, 360, 'Gánh Hàng Rong', {
        fontFamily: 'Arial, "Segoe UI", sans-serif',
        fontSize: '72px',
        color: '#f4e9d8',
      })
      .setOrigin(0.5)
  }
}
