import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        diary: resolve(__dirname, 'diary.html'),
        scan: resolve(__dirname, 'scan.html'),
        profile: resolve(__dirname, 'profile.html'),
      },
    },
  },
})
