/// <reference types="vitest" />
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import pkg from './package.json'

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
      entry:  {
        "index": "src/index.ts",
        "bin": "src/bin.ts"
      },
      formats: [ "cjs" ],
      fileName: "[name]"
    },
    rollupOptions: {
      external: [
        /^node:/,
        ...Object.keys(pkg.devDependencies),
        ...nodeExternal
      ],
    }
  }
}))