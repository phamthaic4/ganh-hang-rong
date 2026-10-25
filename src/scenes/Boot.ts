import Phaser from 'phaser'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  create(): void {
    // M3 chưa có asset để preload; UI do Game launch sau khi store sẵn sàng.
    this.scene.start('Game')
  }
}
