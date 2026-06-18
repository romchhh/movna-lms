import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svg = readFileSync(join(root, 'public/icons/icon.svg'))

for (const size of [192, 512]) {
  await sharp(svg).resize(size, size).png().toFile(join(root, `public/icons/icon-${size}.png`))
}

console.log('Generated PWA icons: icon-192.png, icon-512.png')
