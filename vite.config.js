import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()]
  // server: {
  //   proxy: {
  //     // Mọi API bắt đầu bằng /api hoặc /auth hoặc /login sẽ được chuyển hướng ngầm sang Port 3000
  //     '/api': {
  //       target: 'http://localhost:3000',
  //       changeOrigin: true,
  //       secure: false,
  //     },
  //     '/login': {
  //       target: 'http://localhost:3000',
  //       changeOrigin: true,
  //       secure: false,
  //     },
  //     '/auth': {
  //       target: 'http://localhost:3000',
  //       changeOrigin: true,
  //       secure: false,
  //     }
  //   }
  // }
})