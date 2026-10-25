import { STALLS } from '../core/data'
import { createInitialState } from '../core/state'
import { loadGame, saveGame } from '../core/save'
import { safeStorage, type Storage } from '../platform/storage'
import { tick as coreTick } from '../core/tick'
import type { GameState } from '../core/types'

/**
 * Cầu nối core ↔ Phaser: giữ state, đồng hồ và lưu trữ. Không import Phaser
 * để có thể tái dùng khi cần (logic vẫn nằm toàn bộ trong src/core).
 */
export class GameStore {
  readonly stalls = STALLS
  state: GameState
  paused = false
  private readonly storage: Storage

  constructor(storage?: Storage) {
    this.storage = storage ?? safeStorage()
    this.state = loadGame(this.storage, STALLS) ?? createInitialState(STALLS, Date.now())
  }

  /** Gọi mỗi frame; core tự tính dt từ timestamp và bỏ qua đồng hồ lùi. */
  tick(): void {
    if (this.paused) return
    coreTick(this.state, this.stalls, Date.now())
  }

  togglePause(): boolean {
    this.paused = !this.paused
    if (!this.paused) {
      // Bỏ quãng thời gian tạm dừng, không tính thu nhập cho khoảng đó.
      this.state.lastTickAt = Date.now()
    }
    return this.paused
  }

  save(): boolean {
    return saveGame(this.state, this.storage)
  }
}
