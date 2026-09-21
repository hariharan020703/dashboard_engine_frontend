import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
  /*
   * Read .env from this directory. The third argument is the prefix filter, and
   * '' means "load everything", not just VITE_*.
   *
   * BACKEND_URL is deliberately NOT prefixed with VITE_: it configures the dev
   * server's proxy, which runs in Node, and an unprefixed name is never inlined
   * into the browser bundle. The app itself always calls relative /api paths —
   * proxied here in dev, same-origin in production — so there is no API URL to
   * ship to the client.
   */
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.BACKEND_URL

  // Checked up front for `npm run dev`: an undefined proxy target otherwise
  // surfaces later as a connection error on every request, which is a much
  // harder thing to trace back to a missing .env. `npm run build` needs no
  // backend, so it is not held to this.
  if (command === 'serve' && !backendUrl) {
    throw new Error(
      'BACKEND_URL is not set. Copy frontend/.env.example to frontend/.env, '
    )
  }

  return {
    plugins: [react(), tailwindcss()],
    // @/x -> src/x. Kept in step with the "paths" entry in tsconfig.app.json:
    // TypeScript resolves the alias for the editor, Vite resolves it at build.
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      proxy: {
        '/api': backendUrl,
      },
    },
  }
})
