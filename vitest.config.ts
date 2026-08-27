import { defineConfig } from 'vitest/config'

/** -------------------- 配置出口 -------------------- */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
