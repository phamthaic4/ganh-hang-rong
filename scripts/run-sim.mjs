// Build tools/sim bằng tsc (CommonJS) rồi chạy CLI mô phỏng cân bằng.
import { execSync } from 'node:child_process'
import { rmSync, writeFileSync } from 'node:fs'

rmSync('tools/sim/.build', { recursive: true, force: true })
execSync('tsc -p tools/sim/tsconfig.json', { stdio: 'inherit', shell: true })
// Root package.json là type:module; ghi đè để .js build ra chạy CommonJS.
writeFileSync('tools/sim/.build/package.json', '{"type":"commonjs"}')
const args = process.argv.slice(2).join(' ')
execSync(`node tools/sim/.build/tools/sim/src/main.js ${args}`, {
  stdio: 'inherit',
  shell: true,
})
