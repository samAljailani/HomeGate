import { BadRequestException } from '@nestjs/common'
import sharp from 'sharp'
import { SaxesParser } from 'saxes'

import { imageLibraryDefaults, type ImageValidationConfig } from '@/api/services/config.service'

const SVG_NS = 'http://www.w3.org/2000/svg'
const escapeXml = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function validateSvg(buffer: Buffer, settings: ImageValidationConfig = imageLibraryDefaults): Buffer {
    const elements = new Set(settings.svgElements)
    const attributes = new Set(settings.svgAttributes)
    if (buffer.length > settings.maxSvgBytes)
        throw new BadRequestException(`SVG files must be ${settings.maxSvgBytes / 1024} KB or smaller.`)
    let source: string
    try {
        source = new TextDecoder('utf-8', { fatal: true }).decode(buffer)
    } catch {
        throw new BadRequestException('SVG must be valid UTF-8.')
    }
    const parser = new SaxesParser({ xmlns: true })
    let depth = 0
    let nodes = 0
    let rootSeen = false
    const output: string[] = []
    const reject = () => {
        throw new BadRequestException(
            'Unsafe or unsupported SVG content. Use a static SVG without scripts, styles, or external resources.'
        )
    }
    parser.on('error', reject)
    parser.on('doctype', reject)
    parser.on('processinginstruction', reject)
    // Re-serialize only approved elements and attributes; never store the original XML.
    parser.on('opentag', (tag) => {
        if (
            ++nodes > settings.maxSvgElements ||
            ++depth > settings.maxSvgDepth ||
            tag.uri !== SVG_NS ||
            tag.prefix ||
            !elements.has(tag.local)
        )
            reject()
        if (!rootSeen) {
            if (tag.local !== 'svg') reject()
            rootSeen = true
        } else if (tag.local === 'svg') reject()
        const attrs: string[] = []
        for (const attr of Object.values(tag.attributes)) {
            if (attr.name === 'xmlns' && attr.value === SVG_NS) {
                attrs.push(`xmlns="${SVG_NS}"`)
                continue
            }
            if (
                attr.prefix ||
                attr.uri ||
                !attributes.has(attr.name) ||
                attr.value.length > settings.maxSvgAttributeLength
            )
                reject()
            const value = attr.value
            if (attr.name === 'href') {
                if (!/^#[A-Za-z][\w-]*$/.test(value)) reject()
            } else if (/url\s*\(/i.test(value)) {
                if (!/^url\(#[A-Za-z][\w-]*\)$/.test(value)) reject()
            } else if (!/^[\w\s.,%#+():;-]*$/.test(value)) reject()
            if (attr.name === 'width' || attr.name === 'height') {
                if (
                    !/^\d+(?:\.\d+)?(?:px)?$/.test(value) ||
                    parseFloat(value) <= 0 ||
                    parseFloat(value) > settings.maxDimension
                )
                    reject()
            }
            if (attr.name === 'viewBox') {
                const numbers = value
                    .trim()
                    .split(/[\s,]+/)
                    .map(Number)
                if (
                    numbers.length !== 4 ||
                    numbers.some((n) => !Number.isFinite(n) || Math.abs(n) > settings.maxSvgViewBoxCoordinate) ||
                    numbers[2]! <= 0 ||
                    numbers[3]! <= 0
                )
                    reject()
            }
            attrs.push(`${attr.name}="${escapeXml(value)}"`)
        }
        output.push(`<${tag.local}${attrs.length ? ' ' + attrs.join(' ') : ''}>`)
    })
    parser.on('closetag', (tag) => {
        output.push(`</${tag.local}>`)
        depth--
    })
    parser.on('text', (value) => {
        output.push(escapeXml(value))
    })
    parser.on('cdata', reject)
    try {
        parser.write(source).close()
    } catch {
        reject()
    }
    if (!rootSeen || depth !== 0) reject()
    return Buffer.from(output.join(''), 'utf8')
}

export async function validateImage(
    name: string,
    mime: string,
    buffer: Buffer,
    settings: ImageValidationConfig = imageLibraryDefaults
): Promise<Buffer> {
    if (!settings.filenamePattern.test(name))
        throw new BadRequestException(
            'Use a filename containing letters, numbers, hyphens or underscores, ending in .png or .svg.'
        )
    if (!buffer.length || buffer.length > settings.maxImageBytes)
        throw new BadRequestException(
            `Images must be nonempty and ${settings.maxImageBytes / (1024 * 1024)} MB or smaller.`
        )
    if (name.endsWith('.svg')) {
        if (mime !== 'image/svg+xml') throw new BadRequestException('The file type must match its extension.')
        return validateSvg(buffer, settings)
    }
    if (mime !== 'image/png' || !buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
        throw new BadRequestException('The file is not a PNG image.')
    }
    let offset = 8
    let ended = false
    while (offset + 12 <= buffer.length) {
        const length = buffer.readUInt32BE(offset)
        const type = buffer.toString('ascii', offset + 4, offset + 8)
        if (length > buffer.length - offset - 12 || type === 'acTL' || type === 'fcTL' || type === 'fdAT') {
            throw new BadRequestException('Invalid or animated PNG.')
        }
        offset += length + 12
        if (type === 'IEND') {
            ended = length === 0 && offset === buffer.length
            break
        }
    }
    if (!ended) throw new BadRequestException('Invalid PNG structure or trailing content.')
    try {
        const image = sharp(buffer, {
            failOn: 'warning',
            limitInputPixels: settings.maxPixels,
        }).timeout({ seconds: settings.decodeTimeoutSeconds })
        const metadata = await image.metadata()
        if (
            metadata.format !== 'png' ||
            !metadata.width ||
            !metadata.height ||
            metadata.width > settings.maxDimension ||
            metadata.height > settings.maxDimension ||
            (metadata.pages ?? 1) !== 1
        )
            throw new Error('Invalid dimensions or animation')
        // Decoding and re-encoding removes trailing payloads and embedded metadata.
        const clean = await image.png().toBuffer()
        if (clean.length > settings.maxImageBytes) throw new Error('Encoded image is too large')
        return clean
    } catch {
        throw new BadRequestException(
            `Invalid PNG. Use a static image up to ${settings.maxDimension} pixels per side and ${settings.maxPixels / (1024 * 1024)} megapixels.`
        )
    }
}
