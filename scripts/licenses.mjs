import fs from 'node:fs'
import path from 'node:path'

export function generateNotices(root) {
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'))
  const notices = ['Third-party software distributed with MarkDang', 'Generated from package-lock.json. Third-party licenses remain in effect.']
  for (const [location, entry] of Object.entries(lock.packages).sort(([a], [b]) => a.localeCompare(b))) {
    if (!location || entry.dev) continue
    const dir = path.join(root, location)
    if (!fs.existsSync(path.join(dir, 'package.json'))) continue
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
    const files = fs.readdirSync(dir).filter(name => /^(licen[cs]e|copying|copyright|notice)([.-]|$)/i.test(name) && fs.statSync(path.join(dir, name)).isFile())
    let readmeLicense = ''
    if (!files.length && fs.existsSync(path.join(dir, 'README.md'))) {
      const readme = fs.readFileSync(path.join(dir, 'README.md'), 'utf8')
      readmeLicense = readme.match(/^## License\s*\n([\s\S]*)/m)?.[1]?.trim() ?? ''
    }
    if (!files.length && !readmeLicense) throw new Error(`Missing third-party license text: ${pkg.name}`)
    notices.push(`\n${'='.repeat(72)}\n${pkg.name} ${pkg.version} (${pkg.license ?? entry.license ?? 'see license below'})\n${pkg.homepage ?? ''}`)
    for (const name of files.sort()) notices.push(`${name}\n${fs.readFileSync(path.join(dir, name), 'utf8')}`)
    if (readmeLicense) notices.push(`License section from README.md\n${readmeLicense}`)
  }
  fs.writeFileSync(path.join(root, 'extension/THIRD_PARTY_NOTICES.txt'), notices.join('\n\n') + '\n')
}
