/// <reference types="vitest" />
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

const nodeExternal = [
  "assert",
  "async_hooks",
  "buffer",
  "child_process",
  "constants",
  "crypto",
  "diagnostics_channel",
  "dns",
  "electron",
  "events",
  "fs",
  "fs/promises",
  "http",
  "http2",
  "https",
  "module",
  "net",
  "os",
  "path",
  "process",
  "querystring",
  "stream",
  "string_decoder",
  "tls",
  "tty",
  "url",
  "util",
  "worker_threads",
  "zlib",
  ".prisma/client/index"
]

export default defineConfig(config => ({
  plugins: config.mode === "production"? [
    dts({ rollupTypes: true })
  ]: [],
  build: {
    minify: false,
    sourcemap: true,
    lib: {
      entry:  "src/index.ts",
      formats: [ "cjs" ],
      fileName: "index",
      name: "main"
    },
    rollupOptions: {
      external: [
        /^node:/,
        ...nodeExternal
      ],
    }
  }
}))