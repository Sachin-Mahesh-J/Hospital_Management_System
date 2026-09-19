import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    exclude:
      process.env.HMS_DATABASE_TESTS === 'true'
        ? configDefaults.exclude
        : [...configDefaults.exclude, 'test/database/**'],
    fileParallelism: process.env.HMS_DATABASE_TESTS !== 'true',
    setupFiles: ['./test/setup.ts'],
    restoreMocks: true,
  },
})
