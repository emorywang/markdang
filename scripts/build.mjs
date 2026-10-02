import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const passes = ['pages', 'content', 'background', 'boot', 'mermaid']
for (const target of passes) {
  console.log(`\n=== vite build [${target}] ===`)
  const result = spawnSync('npx', ['vite', 'build', '--mode', target], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, MDR_TARGET: target },
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

/* Chromium rejects extension files whose bytes contain the noncharacters
   U+FFFE/U+FFFF ("not UTF-8"), which appear raw in a mermaid bidi regex.
   Rewriting them as \uFFFE/\uFFFF escapes is semantically identical. */
function sanitize(file) {
  if (!fs.existsSync(file)) return
  let buf = fs.readFileSync(file)
  const before = buf.length
  buf = replaceAllBytes(buf, Buffer.from([0xef, 0xbf, 0xbe]), Buffer.from('\\uFFFE'))
  buf = replaceAllBytes(buf, Buffer.from([0xef, 0xbf, 0xbf]), Buffer.from('\\uFFFF'))
  if (buf.length !== before) {
    fs.writeFileSync(file, buf)
    console.log(`sanitized noncharacters in ${path.basename(file)} (${before} -> ${buf.length} bytes)`)
  }
}

function replaceAllBytes(buf, from, to) {
  let out = buf
  let at = out.indexOf(from)
  while (at !== -1) {
    out = Buffer.concat([out.subarray(0, at), to, out.subarray(at + from.length)])
    at = out.indexOf(from, at + to.length)
  }
  return out
}

for (const file of ['assets/content.js', 'assets/background.js', 'assets/mermaid.js', 'assets/boot.js']) {
  sanitize(path.resolve('extension', file))
}
console.log('\nall builds done')

