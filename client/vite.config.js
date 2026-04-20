import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Allow importing Truffle build artifacts from parent directory
      '../../build': path.resolve(__dirname, '../build'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
})
