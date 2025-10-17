import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
    tailwindcss(),
  ],
  server: {
    host: true, // allows external access (e.g. ngrok)
    port: 5173,
    allowedHosts: [
      'dd983af2a96f.ngrok-free.app' // 👈 your ngrok domain
    ]
  }
})
