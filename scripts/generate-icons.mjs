// Genera los iconos PWA a partir de public/logo.svg.
// Correr con: node scripts/generate-icons.mjs
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')
const svg = await readFile(join(pub, 'logo.svg'))

const BG = '#0b0d10' // igual que theme-color / background_color

// Iconos "any": el propio SVG ya trae fondo oscuro con esquinas redondeadas.
const any = [
  ['pwa-192.png', 192],
  ['pwa-512.png', 512],
  ['favicon-48.png', 48],
]
for (const [name, size] of any) {
  await sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(pub, name))
  console.log('->', name)
}

// Icono maskable: contenido al ~78% sobre fondo full-bleed (safe zone Android).
const maskSize = 512
const inner = Math.round(maskSize * 0.78)
const innerBuf = await sharp(svg, { density: 384 }).resize(inner, inner).png().toBuffer()
await sharp({
  create: { width: maskSize, height: maskSize, channels: 4, background: BG },
})
  .composite([{ input: innerBuf, gravity: 'center' }])
  .png()
  .toFile(join(pub, 'pwa-maskable-512.png'))
console.log('-> pwa-maskable-512.png')

// apple-touch-icon: iOS ignora transparencia y aplica su propia máscara.
// Fondo sólido + leve margen.
const appleSize = 180
const appleInner = Math.round(appleSize * 0.88)
const appleBuf = await sharp(svg, { density: 384 }).resize(appleInner, appleInner).png().toBuffer()
await sharp({
  create: { width: appleSize, height: appleSize, channels: 4, background: BG },
})
  .composite([{ input: appleBuf, gravity: 'center' }])
  .png()
  .toFile(join(pub, 'apple-touch-icon.png'))
console.log('-> apple-touch-icon.png')
