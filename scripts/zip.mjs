import fs from 'node:fs'
import path from 'node:path'
import archiver from 'archiver'

const { version } = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'))
const outDir = path.resolve('dist')
fs.mkdirSync(outDir, { recursive: true })
const zipPath = path.join(outDir, `markdang-v${version}.zip`)

const output = fs.createWriteStream(zipPath)
const archive = archiver('zip', { zlib: { level: 9 } })
const closed = new Promise(resolve => output.on('close', resolve))
archive.pipe(output)
archive.directory(path.resolve('extension'), false)
archive.finalize()
await closed
console.log('zip written:', zipPath, archive.pointer(), 'bytes')
