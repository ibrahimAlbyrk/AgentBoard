import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

function cspUpgradePlugin(): Plugin {
  return {
    name: 'csp-upgrade-insecure',
    transformIndexHtml(html, ctx) {
      if (ctx.bundle) {
        return html
          .replace(/<!--[\s\S]*?-->\s*/g, '')
          .replace(
            '<head>',
            '<head>\n    <meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests" />',
          )
      }
      return html
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), cspUpgradePlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            const location = proxyRes.headers['location']
            if (location && location.includes('localhost:8000')) {
              proxyRes.headers['location'] = location.replace(
                'http://localhost:8000',
                'http://localhost:3000',
              )
            }
          })
        },
      },
    },
  },
})
