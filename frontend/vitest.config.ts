import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    env: {
      VITE_API_URL: 'http://localhost:5000/api/v1',
    },
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
  },
})
