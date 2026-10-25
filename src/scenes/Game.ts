import Phaser from 'phaser'
import type { GameStore } from '../game/store'
import { cycleIncome } from '../core/economy'
import { formatNumber } from '../core/format'
import { tapStall } from '../core/tick'
import type { StallDef } from '../core/types'

/** Màu nền từng quầy (bảng màu tạm cho M3, thay bằng palette.json ở M7). */
const STALL_COLORS = [
  0xc98f3d, 0xd4a94e, 0x7fb069, 0xd97f5d,
  0x8a9ec9, 0xb07ac9, 0xc95f7a, 0x5fb0a8,
]

interface StallCard {
  def: StallDef
  bg: Phaser.GameObjects.Rectangle
  title: Phaser.GameObjects.Text
  info: Phaser.GameObjects.Text
  bar: Phaser.GameObjects.Graphics
  barX: number
  barY: number
}

const CARD_W = 288
const CARD_H = 160
const GAP = 16
/** Tâm của card đầu tiên (cột 0, hàng 0). */
const GRID_X0 = 216
const GRID_Y0 = 256

export class GameScene extends Phaser.Scene {
  private store!: GameStore
  private cards: StallCard[] = []
  private selectedId = ''
  private floatingCount = 0

  constructor() {
    super('Game')
  }

  create(): void {
    this.store = this.registry.get('store') as GameStore
    this.cards = []
    this.floatingCount = 0

    this.store.stalls.forEach((def, i) => {
      const col = i % 4
      const row = Math.floor(i / 4)
      this.createCard(def, GRID_X0 + col * (CARD_W + GAP), GRID_Y0 + row * (CARD_H + GAP), i)
    })
    this.selectedId = this.firstOwnedStall()

    // Cập nhật hiển thị 10 lần/giây để format số lớn không chạy mỗi frame.
    this.time.addEvent({ delay: 100, loop: true, callback: () => this.refreshCards() })
    this.refreshCards()

    this.scene.launch('UI')
  }

  update(): void {
    this.store.tick()
  }

  private firstOwnedStall(): string {
    const owned = this.store.stalls.find((d) => this.store.state.stalls[d.id].count > 0)
    return owned?.id ?? ''
  }

  private createCard(def: StallDef, x: number, y: number, index: number): void {
    const bg = this.add
      .rectangle(x, y, CARD_W, CARD_H, STALL_COLORS[index % STALL_COLORS.length])
      .setStrokeStyle(4, 0x1f1a15)
      .setInteractive({ useHandCursor: true })

    const title = this.add
      .text(x - CARD_W / 2 + 12, y - CARD_H / 2 + 10, def.name, {
        fontFamily: 'Arial, "Segoe UI", sans-serif',
        fontSize: '26px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setShadow(1, 1, '#00000088', 2)

    const info = this.add.text(x - CARD_W / 2 + 12, y - CARD_H / 2 + 48, '', {
      fontFamily: 'Arial, "Segoe UI", sans-serif',
      fontSize: '18px',
      color: '#fff4e0',
    })

    const bar = this.add.graphics()
    const card: StallCard = {
      def,
      bg,
      title,
      info,
      bar,
      barX: x - CARD_W / 2 + 12,
      barY: y + CARD_H / 2 - 40,
    }
    this.cards.push(card)

    bg.on('pointerdown', () => {
      this.selectedId = def.id
      const state = this.store.state
      if (state.stalls[def.id].count === 0) return // quầy chưa mở: chỉ chọn để mua
      const reward = tapStall(state, this.store.stalls, def.id, Date.now())
      if (reward.gt(0)) this.showFloating(x, y - 30, `+${formatNumber(reward)}`)
      this.refreshCards()
    })
  }

  /** Vẽ lại thanh chu kỳ + số liệu; gọi 10 lần/giây. */
  private refreshCards(): void {
    const state = this.store.state
    const dim = this.store.paused ? 0.5 : 1
    for (const card of this.cards) {
      const st = state.stalls[card.def.id]
      const owned = st.count > 0
      card.bg.setAlpha(owned ? dim : 0.35)
      card.bg.setStrokeStyle(
        4,
        card.def.id === this.selectedId ? 0xf4e9d8 : 0x1f1a15,
      )

      if (!owned) {
        card.info.setText(`Chưa mở\nMở: ${formatNumber(card.def.baseCost)}đ`)
        card.bar.clear()
        continue
      }
      const perCycle = formatNumber(cycleIncome(state, this.store.stalls, card.def.id))
      const status = st.helper ? `Tự chạy · ${card.def.cycleSec}s/chu kỳ` : 'Chạm để nấu!'
      card.info.setText(
        `×${st.count}  ·  ${perCycle}đ/chu kỳ\n${status}` +
          (st.helper ? `\nNgười phụ: có` : ''),
      )

      card.bar.clear()
      if (st.helper) {
        const ratio = Math.min(1, st.progress / card.def.cycleSec)
        card.bar.fillStyle(0x00000055, 1)
        card.bar.fillRect(card.barX, card.barY, CARD_W - 24, 18)
        card.bar.fillStyle(0xf4e9d8, 1)
        card.bar.fillRect(card.barX, card.barY, (CARD_W - 24) * ratio, 18)
      }
    }
  }

  /** Số tiền nhận được bay lên khỏi quầy khi chạm. */
  private showFloating(x: number, y: number, text: string): void {
    const label = this.add
      .text(x, y, text, {
        fontFamily: 'Arial, "Segoe UI", sans-serif',
        fontSize: '22px',
        color: '#ffe9a8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(50)
    this.floatingCount++
    this.tweens.add({
      targets: label,
      y: y - 46,
      alpha: 0,
      duration: 480,
      onComplete: () => {
        label.destroy()
        this.floatingCount--
      },
    })
    // Giới hạn số text đang bay để spam chạm không chất đống.
    if (this.floatingCount > 24) {
      label.destroy()
      this.floatingCount--
    }
  }

  /** Quầy đang chọn, dùng chung cho UI scene. */
  getSelectedId(): string {
    if (!this.selectedId) this.selectedId = this.firstOwnedStall()
    return this.selectedId
  }
}
