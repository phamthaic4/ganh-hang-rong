import Decimal from 'break_infinity.js'
import type { GameState, StallDef } from './types'
import type { Storage } from '../platform/storage'
import { SAVE_VERSION, createStallState } from './state'

export const SAVE_KEY = 'ganh-hang-rong-save'

interface RawSave {
  version?: number
  money?: string
  earnedThisRun?: string
  lastTickAt?: number
  tapBucket?: number
  tapCount?: number
  stats?: { taps?: number }
  stalls?: Record<string, { count?: number; helper?: boolean; progress?: number }>
}

/** migrations[v] chuyển save version v lên v+1; rỗng khi chưa có bản cũ nào. */
const migrations: Record<number, (data: RawSave) => RawSave> = {}

export function migrate(data: RawSave): RawSave {
  const v = typeof data.version === 'number' ? data.version : 0
  if (v > SAVE_VERSION) {
    throw new Error(`Save phiên bản ${v} mới hơn phiên bản game (${SAVE_VERSION})`)
  }
  let cur = data
  for (let from = v; from < SAVE_VERSION; from++) {
    const step = migrations[from]
    if (step) cur = step(cur)
  }
  cur.version = SAVE_VERSION
  return cur
}

export function serialize(state: GameState): string {
  const stalls: RawSave['stalls'] = {}
  for (const [id, st] of Object.entries(state.stalls)) {
    stalls[id] = { count: st.count, helper: st.helper, progress: st.progress }
  }
  return JSON.stringify({
    version: state.version,
    money: state.money.toString(),
    earnedThisRun: state.earnedThisRun.toString(),
    lastTickAt: state.lastTickAt,
    tapBucket: state.tapBucket,
    tapCount: state.tapCount,
    stats: { taps: state.stats.taps },
    stalls,
  })
}

function toDecimal(raw: string | undefined): Decimal {
  // Chuỗi không parsable làm constructor ném DecimalError; coi như 0.
  try {
    const d = new Decimal(raw ?? '0')
    return Number.isNaN(d.m) ? new Decimal(0) : d
  } catch {
    return new Decimal(0)
  }
}

export function deserialize(json: string, stalls: StallDef[]): GameState {
  const data = migrate(JSON.parse(json) as RawSave)
  const state: GameState = {
    version: SAVE_VERSION,
    money: toDecimal(data.money),
    earnedThisRun: toDecimal(data.earnedThisRun),
    lastTickAt: Number.isFinite(data.lastTickAt) ? (data.lastTickAt as number) : 0,
    tapBucket: data.tapBucket ?? 0,
    tapCount: data.tapCount ?? 0,
    stats: { taps: Math.max(0, Math.trunc(data.stats?.taps ?? 0)) },
    stalls: {},
  }
  for (const def of stalls) {
    const raw = data.stalls?.[def.id]
    state.stalls[def.id] = {
      ...createStallState(),
      count: Math.max(0, Math.trunc(raw?.count ?? 0)),
      helper: raw?.helper === true,
      progress: Math.max(0, raw?.progress ?? 0),
    }
  }
  return state
}

export function saveGame(state: GameState, storage: Storage): boolean {
  try {
    storage.set(SAVE_KEY, serialize(state))
    return true
  } catch {
    return false
  }
}

/** Load save; null khi chưa có hoặc save hỏng/không tương thích. */
export function loadGame(storage: Storage, stalls: StallDef[]): GameState | null {
  try {
    const json = storage.get(SAVE_KEY)
    if (!json) return null
    return deserialize(json, stalls)
  } catch {
    return null
  }
}
