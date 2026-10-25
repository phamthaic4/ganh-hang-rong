import Decimal from 'break_infinity.js'
import type { GameState, StallDef } from '../../../src/core/types'
import { createInitialState } from '../../../src/core/state'
import {
  buyHelper,
  buyStall,
  costOf,
  incomePerSec,
  stallMilestoneMultiplier,
} from '../../../src/core/economy'
import { tapStall, tick } from '../../../src/core/tick'

export interface Milestones {
  /** Mở quầy đầu tiên (giây). */
  firstStallAt: number | null
  /** Mua unit thêm cho quầy đã có — "nâng cấp" đầu tiên (giây). */
  firstUpgradeAt: number | null
  /** Thuê người phụ đầu tiên (giây). */
  firstHelperAt: number | null
  /** Thu cả lượt đạt 1e6 — P1 khả dụng (giây). */
  earned1e6At: number | null
}

export interface SimResult {
  milestones: Milestones
  finalMoney: string
  finalIncomePerSec: string
  stallCounts: Record<string, number>
  helperCount: number
}

export interface SimOptions {
  days?: number
  /** Phiên đầu chơi liên tục và chạm 2 lần/giây (mặc định 600s). */
  firstSessionSec?: number
  /** Sau phiên đầu: số phiên mỗi ngày (mặc định 4), mỗi phiên sessionSec. */
  sessionsPerDay?: number
  sessionSec?: number
  /** Nhịp xét mua (giây). */
  buyIntervalSec?: number
}

const STEP_SEC = 0.5 // một chạm mỗi bước = 2 chạm/giây

/** Người chơi đang trong phiên chơi hay không (PLAN.md M2). */
function isPlaying(sec: number, firstSessionSec: number, sessionsPerDay: number, sessionSec: number): boolean {
  if (sec <= firstSessionSec) return true
  const dayTime = (sec - firstSessionSec) % 86400
  const gap = 86400 / sessionsPerDay
  for (let i = 0; i < sessionsPerDay; i++) {
    const start = i * gap
    if (dayTime >= start && dayTime < start + sessionSec) return true
  }
  return false
}

/** Chạm vào quầy có thưởng lớn nhất (ưu tiên chưa có người phụ). */
function bestTapStall(state: GameState, stalls: StallDef[]): string {
  let best = stalls[0].id
  let bestScore = -1
  for (const def of stalls) {
    const st = state.stalls[def.id]
    if (st.count === 0) continue
    const score = def.baseIncome * (st.helper ? 0.05 : 1)
    if (score > bestScore) {
      bestScore = score
      best = def.id
    }
  }
  return best
}

/** Mua theo chiến lược tham lam: mở quầy → thuê người phụ → rót unit. */
function greedyBuy(state: GameState, stalls: StallDef[], sec: number, ms: Milestones): void {
  // 1. Mở quầy kế tiếp chưa có unit khi đủ tiền
  const next = stalls.find((d) => state.stalls[d.id].count === 0)
  if (next && state.money.gte(next.baseCost)) {
    buyStall(state, stalls, next.id, 1)
    if (ms.firstStallAt === null) ms.firstStallAt = sec
    return
  }
  // 2. Thuê người phụ cho quầy đã mở, rẻ nhất trước
  const needHelper = stalls
    .filter((d) => {
      const st = state.stalls[d.id]
      return st.count > 0 && !st.helper && state.money.gte(d.helperCost)
    })
    .sort((a, b) => a.helperCost - b.helperCost)
  if (needHelper.length > 0) {
    buyHelper(state, stalls, needHelper[0].id)
    if (ms.firstHelperAt === null) ms.firstHelperAt = sec
    return
  }
  // 3. Còn quầy chờ người phụ thì để dành; hết mới rot unit theo payback tốt nhất
  const waiting = stalls.some((d) => {
    const st = state.stalls[d.id]
    return st.count > 0 && !st.helper
  })
  if (waiting) return

  let bestId: string | null = null
  let bestScore = -1
  for (const def of stalls) {
    const st = state.stalls[def.id]
    if (st.count === 0) continue
    // Δ thu/giây trên mỗi đồng mua unit kế tiếp (bỏ qua nhảy mốc)
    const nextCost = costOf(def, st.count).toNumber()
    const gainPerSec =
      (def.baseIncome * stallMilestoneMultiplier(st.count)) / def.cycleSec
    const score = gainPerSec / nextCost
    if (score > bestScore) {
      bestScore = score
      bestId = def.id
    }
  }
  if (bestId) {
    const before = state.stalls[bestId].count
    buyStall(state, stalls, bestId, 'max')
    if (state.stalls[bestId].count > before && ms.firstUpgradeAt === null) {
      ms.firstUpgradeAt = sec
    }
  }
}

export function simulate(stalls: StallDef[], options: SimOptions = {}): SimResult {
  const {
    days = 2,
    firstSessionSec = 600,
    sessionsPerDay = 4,
    sessionSec = 300,
    buyIntervalSec = 5,
  } = options

  const state = createInitialState(stalls, 0)
  const ms: Milestones = {
    firstStallAt: null,
    firstUpgradeAt: null,
    firstHelperAt: null,
    earned1e6At: null,
  }
  const target1e6 = new Decimal(1e6)

  let step = 0
  for (let sec = STEP_SEC; sec <= days * 86400; sec += STEP_SEC) {
    step++
    const nowMs = sec * 1000
    tick(state, stalls, nowMs)

    if (isPlaying(sec, firstSessionSec, sessionsPerDay, sessionSec)) {
      tapStall(state, stalls, bestTapStall(state, stalls), nowMs)
      if (step % Math.round(buyIntervalSec / STEP_SEC) === 0) {
        greedyBuy(state, stalls, sec, ms)
      }
    }

    if (ms.earned1e6At === null && state.earnedThisRun.gte(target1e6)) {
      ms.earned1e6At = sec
    }
  }

  const stallCounts: Record<string, number> = {}
  let helperCount = 0
  for (const def of stalls) {
    stallCounts[def.id] = state.stalls[def.id].count
    if (state.stalls[def.id].helper) helperCount++
  }
  return {
    milestones: ms,
    finalMoney: state.money.toString(),
    finalIncomePerSec: incomePerSec(state, stalls).toString(),
    stallCounts,
    helperCount,
  }
}
