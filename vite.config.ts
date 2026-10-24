import { defineConfig } from 'vitest/config'

// base tương đối để bản build chạy được ở mọi subpath (GitHub Pages: /<tên-repo>/).
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
  },
  test: {
    include: ['src/**/*.test.ts', 'tools/**/*.test.ts'],
    environment: 'node',
  },
})
