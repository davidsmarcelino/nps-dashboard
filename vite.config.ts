import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    allowedHosts: [
      'localhost',
      '5173-ib60t5dpupwv61wjgtmds-e6b77a75.manusvm.computer',
      '.manusvm.computer'
    ],
    cors: true
  }
})
