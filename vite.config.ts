import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Strict policy lives in index.html and ships in the production build.
const STRICT_CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; connect-src 'self' http: https:; object-src 'none'; frame-src 'none'"
// Dev needs inline script (React Refresh preamble) and JS-injected styles (HMR),
// plus ws: for the dev-server websocket. This is swapped in at serve time only.
const DEV_CSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' http: https: ws:; object-src 'none'; frame-src 'none'"

function devCsp(): Plugin {
  return {
    name: 'dev-csp',
    apply: 'serve',
    transformIndexHtml(html) {
      return html.replace(STRICT_CSP, DEV_CSP)
    },
  }
}

export default defineConfig({
  plugins: [react(), devCsp()],
  base: './',
})
