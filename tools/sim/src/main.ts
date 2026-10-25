import { STALLS } from '../../../src/core/data'
import { formatNumber } from '../../../src/core/format'
import Decimal from 'break_infinity.js'
import { simulate } from './player'

function argNumber(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`)
  if (i === -1 || i + 1 >= process.argv.length) return fallback
  const v = Number(process.argv[i + 1])
  return Number.isFinite(v) ? v : fallback
}

const days = argNumber('days', 2)
const result = simulate(STALLS, { days })

const m = result.milestones
function fmt(sec: number | null): string {
  if (sec === null) return 'không đạt trong mô phỏng'
  if (sec < 90) return `${sec.toFixed(0)} giây`
  return `${(sec / 60).toFixed(1)} phút`
}

console.log(`Bộ mô phỏng cân bằng — ${days} ngày, chạm 2/s 10 phút đầu, sau đó 4 phiên/ngày × 5 phút`)
console.log('─'.repeat(72))
console.log(`Mở quầy đầu tiên        : ${fmt(m.firstStallAt)}`)
console.log(
  `Mua nâng cấp đầu tiên    : ${fmt(m.firstUpgradeAt)}  → mục tiêu < 60 giây      ${verdict(m.firstUpgradeAt !== null && m.firstUpgradeAt < 60)}`,
)
console.log(
  `Người phụ đầu tiên       : ${fmt(m.firstHelperAt)}  → mục tiêu < 3 phút       ${verdict(m.firstHelperAt !== null && m.firstHelperAt < 180)}`,
)
const ok1e6 = m.earned1e6At !== null && m.earned1e6At >= 600 && m.earned1e6At <= 900
console.log(
  `Thu cả lượt 1e6 (P1)     : ${fmt(m.earned1e6At)}  → mục tiêu 10–15 phút     ${verdict(ok1e6)}`,
)
console.log('─'.repeat(72))
console.log(`Cuối mô phỏng: tiền ${formatNumber(new Decimal(result.finalMoney))}, thu ${formatNumber(new Decimal(result.finalIncomePerSec))}/s, ${result.helperCount}/8 người phụ`)
console.log(
  'Số unit từng quầy: ' +
    STALLS.map((s) => `${s.name} ${result.stallCounts[s.id]}`).join(', '),
)

function verdict(ok: boolean): string {
  return ok ? '[ĐẠT]' : '[LỆCH]'
}
