import { inflateSync } from 'node:zlib'

function hexToString(hex: string): string {
  const codes: number[] = []
  for (let index = 0; index < hex.length; index += 4) {
    codes.push(Number.parseInt(hex.slice(index, index + 4), 16))
  }
  return String.fromCharCode(...codes)
}

function inflatedPdfParts(pdf: Buffer): string[] {
  const parts = [pdf.toString('latin1')]
  const streamToken = Buffer.from('stream')
  const endToken = Buffer.from('endstream')
  let cursor = 0
  while (cursor < pdf.length) {
    const start = pdf.indexOf(streamToken, cursor)
    if (start < 0) break
    let dataStart = start + streamToken.length
    if (pdf[dataStart] === 0x0d && pdf[dataStart + 1] === 0x0a) {
      dataStart += 2
    } else if (pdf[dataStart] === 0x0a || pdf[dataStart] === 0x0d) {
      dataStart += 1
    } else {
      cursor = start + streamToken.length
      continue
    }
    const end = pdf.indexOf(endToken, dataStart)
    if (end < 0) break
    let dataEnd = end
    if (
      dataEnd > dataStart &&
      (pdf[dataEnd - 1] === 0x0a || pdf[dataEnd - 1] === 0x0d)
    ) {
      dataEnd -= 1
      if (dataEnd > dataStart && pdf[dataEnd - 1] === 0x0d) dataEnd -= 1
    }
    try {
      parts.push(inflateSync(pdf.subarray(dataStart, dataEnd)).toString('latin1'))
    } catch {
      // Not a FlateDecode stream.
    }
    cursor = end + endToken.length
  }
  return parts
}

export function extractPdfText(pdf: Buffer): string {
  const decoded = inflatedPdfParts(pdf).join('\n')
  const glyphToUnicode = new Map<string, string>()
  for (const match of decoded.matchAll(/<([0-9A-Fa-f]{4})>\s*<([0-9A-Fa-f]+)>/g)) {
    glyphToUnicode.set(match[1]!.toUpperCase(), hexToString(match[2]!))
  }

  const lines: string[] = []
  for (const match of decoded.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) {
    const hex = match[1]!
    let line = ''
    for (let index = 0; index + 4 <= hex.length; index += 4) {
      line += glyphToUnicode.get(hex.slice(index, index + 4).toUpperCase()) ?? ''
    }
    lines.push(line)
  }
  return lines.join('\n')
}
