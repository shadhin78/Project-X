const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// CRC Table & function
const crcTable = [];
for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
        c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    crcTable[n] = c;
}

function crc32(buf) {
    let crc = 0 ^ -1;
    for (let i = 0; i < buf.length; i++) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ -1) >>> 0;
}

function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(4 + 4 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    if (len > 0) {
        data.copy(buf, 8);
    }
    const crcVal = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crcVal, 8 + len);
    return buf;
}

function generatePNG(width, height, outputPath) {
    // 1. Signature
    const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    // 2. IHDR
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8; // 8 bits per channel
    ihdrData[9] = 6; // Color type 6: RGBA
    ihdrData[10] = 0; // Compression
    ihdrData[11] = 0; // Filter
    ihdrData[12] = 0; // Interlace
    const ihdrChunk = makeChunk('IHDR', ihdrData);

    // 3. Scanline Data
    const rowSize = 1 + 4 * width;
    const rawData = Buffer.alloc(height * rowSize);

    const cx = width / 2;
    const cy = height / 2;

    for (let y = 0; y < height; y++) {
        const offset = y * rowSize;
        rawData[offset] = 0; // Filter type 0: None

        for (let x = 0; x < width; x++) {
            const pxOffset = offset + 1 + x * 4;

            // Generate premium linear top-left to bottom-right background gradient
            const t = (x + y) / (width + height);
            // Deep Indigo (#1e1b4b) to Deep Slate (#0f172a)
            let r = Math.round((1 - t) * 30 + t * 15);
            let g = Math.round((1 - t) * 27 + t * 23);
            let b = Math.round((1 - t) * 75 + t * 42);
            let a = 255;

            // Draw a glowing, stylized academic/dashboard 'X' emblem
            const dx = x - cx;
            const dy = y - cy;
            const sizeLimit = width * 0.28;

            if (Math.abs(dx) < sizeLimit && Math.abs(dy) < sizeLimit) {
                // Calculate distances to both diagonals
                const dist1 = Math.abs(dx - dy);
                const dist2 = Math.abs(dx + dy);
                const minDist = Math.min(dist1, dist2);

                const glowThickness = width * 0.045;
                const coreThickness = width * 0.018;

                if (minDist < glowThickness) {
                    if (minDist < coreThickness) {
                        // Inner core: pure bright white
                        const coreT = minDist / coreThickness;
                        r = Math.round((1 - coreT) * 255 + coreT * 56);
                        g = Math.round((1 - coreT) * 255 + coreT * 189);
                        b = Math.round((1 - coreT) * 255 + coreT * 248);
                    } else {
                        // Outer core: glowing blue (#38bdf8 to #6366f1)
                        const glowT = (minDist - coreThickness) / (glowThickness - coreThickness);
                        r = Math.round((1 - glowT) * 56 + glowT * r);
                        g = Math.round((1 - glowT) * 189 + glowT * g);
                        b = Math.round((1 - glowT) * 248 + glowT * b);
                    }
                }
            }

            rawData[pxOffset] = r;
            rawData[pxOffset + 1] = g;
            rawData[pxOffset + 2] = b;
            rawData[pxOffset + 3] = a;
        }
    }

    // 4. IDAT Chunk
    const compressed = zlib.deflateSync(rawData);
    const idatChunk = makeChunk('IDAT', compressed);

    // 5. IEND Chunk
    const iendChunk = makeChunk('IEND', Buffer.alloc(0));

    // Combine all
    const pngBuffer = Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
    fs.writeFileSync(outputPath, pngBuffer);
    console.log(`PNG Icon created successfully: ${outputPath} (${width}x${height})`);
}

// Generate PWA requirements: 192x192 and 512x512
const icon192Path = path.join(__dirname, 'icon-192.png');
const icon512Path = path.join(__dirname, 'icon-512.png');

generatePNG(192, 192, icon192Path);
generatePNG(512, 512, icon512Path);
