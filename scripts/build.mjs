import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateNotices } from './licenses.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const vite = path.join(root, 'node_modules/vite/bin/vite.js')
const passes = ['pages', 'content', 'background', 'boot', 'mermaid']

function build() {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/manifest.json'), 'utf8'))
  if (pkg.version !== manifest.version || pkg.version !== manifest.version_name) throw new Error('Package and manifest versions must match')
  fs.rmSync(path.join(root, 'extension'), { recursive: true, force: true })
  for (const target of passes) {
    const result = spawnSync(process.execPath, [vite, 'build', '--mode', target], {
      cwd: root, stdio: 'inherit', env: { ...process.env, MDR_TARGET: target },
    })
    if (result.error) throw result.error
    if (result.status !== 0) throw new Error(`Build failed: ${target} (exit ${result.status})`)
  }
  /* Chromium rejects raw noncharacters in Mermaid's bidi regex. */
  for (const name of fs.readdirSync(path.join(root, 'extension/assets'))) {
    if (!name.endsWith('.js')) continue
    const file = path.join(root, 'extension/assets', name)
    const text = fs.readFileSync(file, 'utf8')
    const safe = text.replace(/\uFFFE/g, '\\uFFFE').replace(/\uFFFF/g, '\\uFFFF')
    if (safe !== text) fs.writeFileSync(file, safe)
  }
  for (const name of ['LICENSE', 'NOTICE', 'TRADEMARKS.md', 'PRIVACY.md', 'PRIVACY.zh-CN.md']) {
    fs.copyFileSync(path.join(root, name), path.join(root, 'extension', name))
  }
  const formulaFonts = path.join(root, 'extension/fonts/katex')
  fs.mkdirSync(formulaFonts, { recursive: true })
  const fontSource = path.join(root, 'node_modules/katex/dist/fonts')
  for (const name of fs.readdirSync(fontSource).filter(name => name.endsWith('.woff2'))) {
    fs.copyFileSync(path.join(fontSource, name), path.join(formulaFonts, name))
  }
  generateNotices(root)
  console.log('Build complete: extension/')
}

try {
  build()
} catch (error) {
  console.error(error)
  process.exit(1)
}

if (process.argv.includes('--watch')) {
  let timer
  const changed = () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      try { build() } catch (error) { console.error(error) }
    }, 300)
  }
  for (const dir of ['src', 'public']) fs.watch(path.join(root, dir), { recursive: true }, changed)
  for (const name of ['vite.config.ts', 'package.json', 'package-lock.json', 'LICENSE', 'NOTICE', 'TRADEMARKS.md', 'PRIVACY.md', 'PRIVACY.zh-CN.md']) {
    fs.watch(path.join(root, name), changed)
  }
  console.log('Watching source files. Reload the extension after each build.')
}
