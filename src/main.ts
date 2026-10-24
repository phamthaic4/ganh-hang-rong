import Phaser from 'phaser'
import { BootScene } from './scenes/Boot'
import { GameScene } from './scenes/Game'
import { UIScene } from './scenes/UI'

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#14100d',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, GameScene, UIScene],
})
