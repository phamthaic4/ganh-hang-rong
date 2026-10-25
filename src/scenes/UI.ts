import Phaser from 'phaser'
import type { GameStore } from '../game/store'
import { Button } from '../ui/button'
import { bulkCost, buyHelper, buyStall, incomePerSec, maxBuyCount } from '../core/economy'
import { formatNumber } from '../core/format'

type BuyQty = 1 | 10 | 100 | 'max'

const AUTOSAVE_MS = 10_000

export class UIScene extends Phaser.Scene {
  private store!: GameStore
  private moneyText!: Phaser.GameObjects.Text
  private incomeText!: Phaser.GameObjects.Text
  private pauseButton!: Button
  private buyButton!: Button
  private helperButton!: Button
  private qtyButtons: { qty: BuyQty; button: Button }[] = []
  private selectedQty: BuyQty = 1
  private saveOnHide = (): void => {
    this.store.save()
  }

  constructor() {
    super('UI')
  }

  create(): void {
    this.store = this.registry.get('store') as GameStore

    this.moneyText = this.add.text(24, 20, '', {
      fontFamily: 'Arial, "Segoe UI", sans-serif',
      fontSize: '36px',
      color: '#ffe9a8',
      fontStyle: 'bold',
    })
    this.incomeText = this.add.text(24, 64, '', {
      fontFamily: 'Arial, "Segoe UI", sans-serif',
      fontSize: '22px',
      color: '#cbbfa8',
    })

    this.pauseButton = new Button(this, 1160, 46, 'Tạm dừng', {
      width: 180,
      height: 52,
      fill: 0x7a5c3e,
      fontSize: 22,
    }, () => {
      const paused = this.store.togglePause()
      this.pauseButton.setText(paused ? 'Chạy tiếp' : 'Tạm dừng')
    })

    this.createBuyPanel()

    this.time.addEvent({ delay: 100, loop: true, callback: () => this.refreshHud() })
    this.time.addEvent({
      delay: AUTOSAVE_MS,
      loop: true,
      callback: () => this.store.save(),
    })
    // Lưu khi đóng tab / ẩn tab (QA: dữ liệu không mất).
    window.addEventListener('beforeunload', this.saveOnHide)
    document.addEventListener('visibilitychange', this.saveOnHide)
    this.events.once('shutdown', () => {
      window.removeEventListener('beforeunload', this.saveOnHide)
      document.removeEventListener('visibilitychange', this.saveOnHide)
    })
    this.refreshHud()
  }

  private createBuyPanel(): void {
    const y0 = 596
    const quantities: BuyQty[] = [1, 10, 100, 'max']
    this.qtyButtons = quantities.map((qty, i) => {
      const button = new Button(this, 132 + i * 152, y0, this.qtyLabel(qty), {
        width: 140,
        height: 46,
        fill: 0x51606d,
        fontSize: 20,
      }, () => {
        this.selectedQty = qty
        this.refreshHud()
      })
      return { qty, button }
    })

    this.buyButton = new Button(this, 360, y0 + 68, 'Mua', {
      width: 560,
      height: 62,
      fill: 0x3e7a4f,
      fontSize: 24,
    }, () => this.tryBuy())

    this.helperButton = new Button(this, 1000, y0 + 68, 'Thuê người phụ', {
      width: 420,
      height: 62,
      fill: 0x8a6d3b,
      fontSize: 22,
    }, () => this.tryBuyHelper())
  }

  private qtyLabel(qty: BuyQty): string {
    return qty === 'max' ? 'MAX' : `×${qty}`
  }

  private tryBuy(): void {
    const id = this.selectedStallId()
    if (!id) return
    const state = this.store.state
    const st = state.stalls[id]
    if (st.count === 0) {
      buyStall(state, this.store.stalls, id, 1)
    } else {
      buyStall(state, this.store.stalls, id, this.selectedQty)
    }
    this.refreshHud()
  }

  private tryBuyHelper(): void {
    const id = this.selectedStallId()
    if (!id) return
    buyHelper(this.store.state, this.store.stalls, id)
    this.refreshHud()
  }

  private selectedStallId(): string {
    const game = this.scene.get('Game') as { getSelectedId?: () => string }
    return game?.getSelectedId?.() ?? ''
  }

  /** Cập nhật HUD + nút 10 lần/giây; format Decimal rẻ nên không giật. */
  private refreshHud(): void {
    const state = this.store.state
    this.moneyText.setText(`Tiền: ${formatNumber(state.money)}đ`)
    this.incomeText.setText(`Thu: ${formatNumber(incomePerSec(state, this.store.stalls))}/s`)

    for (const { qty, button } of this.qtyButtons) {
      button.setSelected(qty === this.selectedQty)
    }

    const id = this.selectedStallId()
    const def = this.store.stalls.find((s) => s.id === id)
    const st = id ? state.stalls[id] : undefined
    if (!def || !st) {
      this.buyButton.setText('Chọn một quầy')
      this.buyButton.setEnabled(false)
      this.helperButton.setText('Thuê người phụ')
      this.helperButton.setEnabled(false)
      return
    }

    if (st.count === 0) {
      const price = formatNumber(def.baseCost)
      this.buyButton.setText(`Mở ${def.name} (${price}đ)`)
      this.buyButton.setEnabled(state.money.gte(def.baseCost))
      this.helperButton.setText(`Thuê người phụ (${formatNumber(def.helperCost)}đ)`)
      this.helperButton.setEnabled(false)
      return
    }

    const qty = this.selectedQty
    const count = qty === 'max' ? Math.max(1, maxBuyCount(def, st.count, state.money)) : qty
    const price =
      qty === 'max'
        ? bulkCost(def, st.count, count)
        : bulkCost(def, st.count, qty)
    const affordable = state.money.gte(price)
    this.buyButton.setText(
      qty === 'max'
        ? `Mua ${def.name} tối đa (×${count} — ${formatNumber(price)}đ)`
        : `Mua ${def.name} ×${qty} (${formatNumber(price)}đ)`,
    )
    this.buyButton.setEnabled(affordable)

    if (st.helper) {
      this.helperButton.setText('Đã có người phụ ✓')
      this.helperButton.setEnabled(false)
    } else {
      this.helperButton.setText(`Thuê người phụ (${formatNumber(def.helperCost)}đ)`)
      this.helperButton.setEnabled(state.money.gte(def.helperCost))
    }
  }
}
