import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { resolve } from 'node:path'

/* Manifest content scripts and this classic MV3 worker use IIFEs, so they are built as single-file IIFE bundles with all
   dynamic imports inlined. Extension pages (options/popup) may use
   ES modules and are built together in the "pages" pass. */

const common = {
  plugins: [preact()],
  build: {
    outDir: 'extension',
    target: 'chrome110',
    assetsInlineLimit: 20 * 1024 * 1024,
  },
}

const pages = defineConfig({
  ...common,
  build: {
    ...common.build,
    emptyOutDir: false,
    rollupOptions: {
      input: {
        options: resolve(__dirname, 'src/options/index.html'),
        popup: resolve(__dirname, 'src/popup/index.html'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
})

const content = defineConfig({
  ...common,
  build: {
    ...common.build,
    emptyOutDir: false,
    rollupOptions: {
      input: { content: resolve(__dirname, 'src/content/index.ts') },
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'assets/content.js',
      },
    },
  },
})

const background = defineConfig({
  ...common,
  build: {
    ...common.build,
    emptyOutDir: false,
    rollupOptions: {
      input: { background: resolve(__dirname, 'src/background/index.ts') },
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'assets/background.js',
      },
    },
  },
})

const boot = defineConfig({
  ...common,
  plugins: [],
  build: {
    ...common.build,
    emptyOutDir: false,
    rollupOptions: {
      input: { boot: resolve(__dirname, 'src/boot/index.ts') },
      output: {
        format: 'iife',
        entryFileNames: 'assets/boot.js',
      },
    },
  },
})

const mermaid = defineConfig({
  ...common,
  build: {
    ...common.build,
    emptyOutDir: false,
    rollupOptions: {
      input: { mermaid: resolve(__dirname, 'src/content/mermaid-entry.ts') },
      output: { format: 'iife', inlineDynamicImports: true, entryFileNames: 'assets/mermaid.js' },
    },
  },
})

const targets = { pages, content, background, boot, mermaid }
const target = process.env.MARKDANG_TARGET ?? 'pages'
if (!(target in targets)) throw new Error(`Unknown build target: ${target}`)
export default targets[target as keyof typeof targets]
