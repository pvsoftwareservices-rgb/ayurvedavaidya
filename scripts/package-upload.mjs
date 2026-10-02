// Builds output/ayurvedavaidya-hostinger-upload.zip — the project source Hostinger needs to run
// `npm install` + `npm run build` (Node.js Web App → upload ZIP). Contains the files git tracks (plus new,
// not-ignored files), minus what the build does not need: image masters, tests, docs and tooling config.
// Never contains .env files, credentials, node_modules, dist or output (all git-ignored).
//   npm run package
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { crc32, deflateRawSync } from 'node:zlib'

const OUT = 'output/ayurvedavaidya-hostinger-upload.zip'
const EXCLUDE = [/^source-files\//, /^tests\//, /^docs\//, /^\.claude\//, /^playwright\.config\.mjs$/, /^\.env/, /(^|\/)mail-config\.php$/]

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
  .split('\n').filter(Boolean)
  .filter((f) => !EXCLUDE.some((re) => re.test(f)))
  .filter((f) => { try { return statSync(f).isFile() } catch { return false } }) // skip files deleted in the work tree
  .sort()

/** Minimal ZIP writer (deflate, UTF-8 names). */
function zip(entries) {
  const local = []
  const central = []
  let offset = 0
  for (const name of entries) {
    const data = readFileSync(name)
    const packed = deflateRawSync(data, { level: 9 })
    const nameBuf = Buffer.from(name, 'utf8')
    const crc = crc32(data)
    const header = Buffer.alloc(30)
    header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x0800, 6); header.writeUInt16LE(8, 8)
    header.writeUInt32LE(crc, 14); header.writeUInt32LE(packed.length, 18); header.writeUInt32LE(data.length, 22); header.writeUInt16LE(nameBuf.length, 26)
    local.push(header, nameBuf, packed)
    const dir = Buffer.alloc(46)
    dir.writeUInt32LE(0x02014b50, 0); dir.writeUInt16LE(20, 4); dir.writeUInt16LE(20, 6); dir.writeUInt16LE(0x0800, 8); dir.writeUInt16LE(8, 10)
    dir.writeUInt32LE(crc, 16); dir.writeUInt32LE(packed.length, 20); dir.writeUInt32LE(data.length, 24); dir.writeUInt16LE(nameBuf.length, 28)
    dir.writeUInt32LE(offset, 42)
    central.push(dir, nameBuf)
    offset += header.length + nameBuf.length + packed.length
  }
  const centralSize = central.reduce((n, b) => n + b.length, 0)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralSize, 12); end.writeUInt32LE(offset, 16)
  return Buffer.concat([...local, ...central, end])
}

mkdirSync('output', { recursive: true })
const buffer = zip(files)
writeFileSync(OUT, buffer)
console.log(`${OUT}: ${files.length} files, ${(buffer.length / 1024 / 1024).toFixed(1)} MB`)
