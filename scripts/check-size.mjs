// Kiểm tra tổng dung lượng thư mục dist dưới 8MB (docs/PLAN.md, mục 2).
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const LIMIT_BYTES = 8 * 1024 * 1024
const distDir = fileURLToPath(new URL('../dist', import.meta.url))

if (!existsSync(distDir)) {
  console.error('Không tìm thấy dist/ — hãy chạy build trước.')
  process.exit(1)
}

function totalSize(dir) {
  let sum = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    sum += entry.isDirectory() ? totalSize(path) : statSync(path).size
  }
  return sum
}

const bytes = totalSize(distDir)
const mb = bytes / (1024 * 1024)
console.log(`Dung lượng dist: ${mb.toFixed(2)} MB (giới hạn 8 MB)`)

if (bytes >= LIMIT_BYTES) {
  console.error('Vượt giới hạn 8 MB.')
  process.exit(1)
}
