import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import archiver from 'archiver'

const root = fileURLToPath(new URL('../', import.meta.url))
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const source = path.join(root, 'extension')
const manifest = JSON.parse(fs.readFileSync(path.join(source, 'manifest.json'), 'utf8'))
if (manifest.version !== version) throw new Error('Build version does not match package.json')
for (const name of ['LICENSE', 'NOTICE', 'TRADEMARKS.md', 'PRIVACY.md', 'THIRD_PARTY_NOTICES.txt']) {
  if (!fs.existsSync(path.join(source, name))) throw new Error(`Missing release file: ${name}`)
}
const outDir = path.join(root, 'dist')
fs.mkdirSync(outDir, { recursive: true })
const zipPath = path.join(outDir, `markdang-v${version}.zip`)
const temporary = zipPath + '.tmp'
const output = fs.createWriteStream(temporary)
const archive = archiver('zip', { zlib: { level: 9 } })
try {
  const closed = new Promise((resolve, reject) => {
    output.once('close', resolve)
    output.once('error', reject)
    archive.once('error', reject)
    archive.once('warning', reject)
  })
  archive.pipe(output)
  archive.directory(source, false)
  await Promise.all([archive.finalize(), closed])
  fs.renameSync(temporary, zipPath)
  console.log(`Package written: ${zipPath} (${archive.pointer()} bytes)`)
} catch (error) {
  archive.abort()
  output.destroy()
  fs.rmSync(temporary, { force: true })
  throw error
}
