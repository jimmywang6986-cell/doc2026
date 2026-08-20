import { defineConfig, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The `test` field is consumed by Vitest at runtime. It is attached through a
// typed variable so Vite's own `defineConfig` overloads don't reject the extra
// key (Vite 8 and Vitest ship slightly different Vite type versions).
const config: UserConfig & { test?: Record<string, unknown> } = {
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
}

// https://vite.dev/config/
export default defineConfig(config)
