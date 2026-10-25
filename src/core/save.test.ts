import { describe, expect, it } from 'vitest'
import Decimal from 'break_infinity.js'
import { createInitialState } from './state'
import type { StallDef } from './types'
import { memoryStorage } from '../platform/storage'
import { SAVE_KEY, deserialize, loadGame, migrate, saveGame, serialize } from './save'

const STALLS: StallDef[] = [
  {
    id: 'xoi',
    name: 'Xôi lạc',
    baseCost: 4,
    growth: 1.07,
    baseIncome: 1,
    cycleSec: 1,
    helperCost: 50,
  },
  {
    id: 'banhmi',
    name: 'Bánh mì',
    baseCost: 60,
    growth: 1.15,
    baseIncome: 60,
    cycleSec: 3,
    helperCost: 1000,
  },
]

function sampleState() {
  const state = createInitialState(STALLS, 12345)
  state.money = new Decimal('98765.4321')
  state.earnedThisRun = new Decimal('1e12')
  state.stalls.xoi.count = 3
  state.stalls.xoi.helper = true
  state.stalls.xoi.progress = 0.5
  state.stalls.banhmi.count = 7
  state.stats.taps = 42
  return state
}

describe('serialize / deserialize', () => {
  it('roundtrip giữ nguyên mọi trường', () => {
    const state = sampleState()
    const restored = deserialize(serialize(state), STALLS)
    expect(restored.money.eq(state.money)).toBe(true)
    expect(restored.earnedThisRun.eq(state.earnedThisRun)).toBe(true)
    expect(restored.lastTickAt).toBe(12345)
    expect(restored.stalls.xoi).toEqual({ count: 3, helper: true, progress: 0.5 })
    expect(restored.stalls.banhmi).toEqual({ count: 7, helper: false, progress: 0 })
    expect(restored.stats.taps).toBe(42)
    expect(restored.version).toBe(state.version)
  })

  it('save thiếu quầy (dữ liệu mới thêm) thì quầy đó về mặc định', () => {
    const state = sampleState()
    const json = serialize(state)
    const parsed = JSON.parse(json as string) as { stalls: Record<string, unknown> }
    delete parsed.stalls.banhmi
    const restored = deserialize(JSON.stringify(parsed), STALLS)
    expect(restored.stalls.banhmi.count).toBe(0)
    expect(restored.stalls.banhmi.helper).toBe(false)
  })

  it('số tiền không parsable coi như 0, không phá game', () => {
    const state = sampleState()
    const parsed = JSON.parse(serialize(state)) as { money: string }
    parsed.money = 'khong-phai-so'
    const restored = deserialize(JSON.stringify(parsed), STALLS)
    expect(restored.money.toNumber()).toBe(0)
  })
})

describe('migrate', () => {
  it('save ở phiên bản hiện tại giữ nguyên dữ liệu', () => {
    const data = { version: 1, money: '10' }
    expect(migrate(structuredClone(data) as never)).toEqual({ version: 1, money: '10' })
  })

  it('save thiếu version được coi như cũ nhất và nâng lên hiện tại', () => {
    const out = migrate({ money: '10' } as never)
    expect(out.version).toBe(1)
  })

  it('save phiên bản tương lai thì bỏ lỗi', () => {
    expect(() => migrate({ version: 99, money: '1' } as never)).toThrow()
  })
})

describe('saveGame / loadGame với Storage', () => {
  it('chưa có save thì load trả null', () => {
    expect(loadGame(memoryStorage(), STALLS)).toBeNull()
  })

  it('lưu rồi tải lại bằng đúng state', () => {
    const storage = memoryStorage()
    const state = sampleState()
    expect(saveGame(state, storage)).toBe(true)
    const restored = loadGame(storage, STALLS)
    expect(restored?.money.eq(state.money)).toBe(true)
    expect(restored?.stalls.xoi.helper).toBe(true)
  })

  it('save hỏng (JSON lạ) thì load trả null thay vì văng', () => {
    const storage = memoryStorage()
    storage.set(SAVE_KEY, '{khong-hop-le')
    expect(loadGame(storage, STALLS)).toBeNull()
  })
})
