const fs = require('fs')
const path = require('path')

const srcIco = path.join(__dirname, '../favicon.ico')
const pub = path.join(__dirname, '../public')

// Output targets: [filename, width, height]
const TARGETS = [
    ['pwa-192x192.png', 192, 192],
    ['pwa-512x512.png', 512, 512],
    ['favicon-32x32.png', 32, 32],
    ['favicon-16x16.png', 16, 16],
    ['apple-touch-icon.png', 180, 180],
]

// ---------------------------------------------------------------------------
// Parse ICO and return a Buffer containing the largest embedded image.
// Each directory entry may embed a PNG (starts with 0x89504E47) or a BMP.
// ---------------------------------------------------------------------------
function extractLargestFromIco(icoPath) {
    const buf = fs.readFileSync(icoPath)

    if (buf.readUInt16LE(0) !== 0 || buf.readUInt16LE(2) !== 1) {
        throw new Error('Not a valid ICO file: ' + icoPath)
    }

    const count = buf.readUInt16LE(4)
    let best = null
    let bestArea = -1

    for (let i = 0; i < count; i++) {
        const base = 6 + i * 16
        const w = buf[base] || 256   // 0 encodes 256
        const h = buf[base + 1] || 256
        const size = buf.readUInt32LE(base + 8)
        const offset = buf.readUInt32LE(base + 12)
        const area = w * h

        if (area > bestArea) {
            bestArea = area
            best = { offset, size }
        }
    }

    if (!best) throw new Error('No image entries found in ICO')
    return buf.slice(best.offset, best.offset + best.size)
}

// ---------------------------------------------------------------------------
// Build a minimal multi-size ICO file from an array of raw PNG Buffers.
// ---------------------------------------------------------------------------
function buildIco(pngBuffers) {
    const count = pngBuffers.length
    const headerSize = 6
    const dirEntrySize = 16
    const dirSize = dirEntrySize * count

    // We need image dimensions — read them from PNG IHDR (offset 16)
    const entries = pngBuffers.map(buf => {
        const w = buf.readUInt32BE(16)
        const h = buf.readUInt32BE(20)
        return { buf, w: Math.min(w, 255) || 0, h: Math.min(h, 255) || 0 }
    })

    const totalImageBytes = pngBuffers.reduce((s, b) => s + b.length, 0)
    const out = Buffer.alloc(headerSize + dirSize + totalImageBytes)

    // ICONDIR
    out.writeUInt16LE(0, 0)      // reserved
    out.writeUInt16LE(1, 2)      // type: ICO
    out.writeUInt16LE(count, 4)  // image count

    let imageOffset = headerSize + dirSize
    entries.forEach(({ buf, w, h }, i) => {
        const base = headerSize + i * dirEntrySize
        out[base] = w           // width  (0 = 256)
        out[base + 1] = h           // height (0 = 256)
        out[base + 2] = 0           // color count
        out[base + 3] = 0           // reserved
        out.writeUInt16LE(1, base + 4)              // planes
        out.writeUInt16LE(32, base + 6)             // bit count
        out.writeUInt32LE(buf.length, base + 8)     // image size
        out.writeUInt32LE(imageOffset, base + 12)   // image offset
        buf.copy(out, imageOffset)
        imageOffset += buf.length
    })

    return out
}

async function run() {
    let sharp
    try {
        sharp = require('sharp')
    } catch {
        console.error('sharp is not installed. Run: npm install sharp --save-dev')
        process.exit(1)
    }

    if (!fs.existsSync(srcIco)) {
        console.error('favicon.ico not found at:', srcIco)
        process.exit(1)
    }

    if (!fs.existsSync(pub)) fs.mkdirSync(pub, { recursive: true })

    const imgBuf = extractLargestFromIco(srcIco)
    const isPng = imgBuf[0] === 0x89 && imgBuf[1] === 0x50
    console.log(`Extracted ${imgBuf.length} bytes from ICO (${isPng ? 'PNG' : 'BMP'})`)

    // Generate all PNG targets
    for (const [filename, w, h] of TARGETS) {
        const outPath = path.join(pub, filename)
        await sharp(imgBuf).resize(w, h).png().toFile(outPath)
        console.log(`✅ ${filename}`)
    }

    // Generate favicon.ico (multi-size: 16, 32, 48)
    const icoSizes = [16, 32, 48]
    const pngBufs = await Promise.all(
        icoSizes.map(s => sharp(imgBuf).resize(s, s).png().toBuffer())
    )
    const icoOut = path.join(pub, 'favicon.ico')
    fs.writeFileSync(icoOut, buildIco(pngBufs))
    console.log('✅ favicon.ico  (16×16, 32×32, 48×48)')
}

run().catch(err => {
    console.error('Error:', err.message)
    process.exit(1)
})
