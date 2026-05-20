import sharp from 'sharp'
import { writeFileSync } from 'fs'

// SVG template for the VP icon
function makeSVG(size) {
  const r = Math.round(size * 0.2)
  const fs = Math.round(size * 0.38)
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" rx="${r}" fill="#1e3a8a"/>
      <text
        x="50%" y="54%"
        dominant-baseline="middle"
        text-anchor="middle"
        font-family="Arial,sans-serif"
        font-weight="800"
        font-size="${fs}"
        fill="white"
      >VP</text>
    </svg>
  `)
}

for (const size of [192, 512]) {
  await sharp(makeSVG(size))
    .png()
    .toFile(`public/icon-${size}.png`)
  console.log(`icon-${size}.png created`)
}
