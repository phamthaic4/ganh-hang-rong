import Phaser from 'phaser'
import { GameStore } from './game/store'
import { BootScene } from './scenes/Boot'
import { GameScene } from './scenes/Game'
import { UIScene } from './scenes/UI'

const store = new GameStore()

const game = new Phaser.Game({
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

game.registry.set('store', store)

// Hook kiểm thử tự động (đọc state/scene khi smoke-test bằng trình duyệt).
;(window as unknown as Record<string, unknown>).__ghr = store
;(window as unknown as Record<string, unknown>).__ghrGame = game

// Chặn menu ngữ cảnh khi chạm giữ trên điện thoại.
window.addEventListener('contextmenu', (e) => e.preventDefault())

export { game, store }
