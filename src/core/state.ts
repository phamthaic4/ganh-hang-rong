import Decimal from 'break_infinity.js'
import type { GameState, StallDef, StallState } from './types'

export const SAVE_VERSION = 1

/**
 * Tiền khởi đầu: PLAN không ghi rõ, nhưng phải đủ mua quầy đầu tiên (Xôi lạc 4)
 * nếu không game không thể bắt đầu. 4 là mức tối thiểu tự nhiên.
 */
export const START_MONEY = 4

export function createStallState(): StallState {
  return { count: 0, helper: false, progress: 0 }
}

export function createInitialState(stalls: StallDef[], nowMs = 0): GameState {
  const stallStates: Record<string, StallState> = {}
  for (const def of stalls) stallStates[def.id] = createStallState()
  return {
    version: SAVE_VERSION,
    money: new Decimal(START_MONEY),
    earnedThisRun: new Decimal(0),
    lastTickAt: nowMs,
    tapBucket: 0,
    tapCount: 0,
    stats: { taps: 0 },
    stalls: stallStates,
  }
}
