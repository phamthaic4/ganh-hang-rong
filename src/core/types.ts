import type Decimal from 'break_infinity.js'

/** Định nghĩa quầy, nạp từ src/data/stalls.json (PLAN.md mục 5.2). */
export interface StallDef {
  id: string
  name: string
  baseCost: number
  growth: number
  baseIncome: number
  cycleSec: number
  helperCost: number
}

/** Trạng thái runtime của một quầy. */
export interface StallState {
  count: number
  helper: boolean
  /** Giây đã tích lũy trong chu kỳ hiện tại; chỉ chạy khi có người phụ. */
  progress: number
}

export interface GameStats {
  taps: number
}

export interface GameState {
  version: number
  money: Decimal
  /** Tổng thu trong lượt chơi hiện tại; dùng cho điều kiện prestige (M4). */
  earnedThisRun: Decimal
  /** Timestamp (ms) của lần tick gần nhất. */
  lastTickAt: number
  /** Cửa sổ giới hạn chạm: bucket = floor(nowMs / 1000). */
  tapBucket: number
  tapCount: number
  stats: GameStats
  stalls: Record<string, StallState>
}
