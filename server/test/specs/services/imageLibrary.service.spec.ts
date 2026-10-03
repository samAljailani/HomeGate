import {
    BadRequestException,
    ConflictException,
    NotFoundException,
} from '@nestjs/common'
import {
    mkdtemp,
    mkdir,
    readFile,
    readdir,
    rm,
    writeFile,
    symlink,
} from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { Reflector } from '@nestjs/core'
import { ImageLibraryService } from '@/api/services/imageLibrary.service'
import { ImageLibraryController } from '@/api/controllers/imageLibrary.controller'
import { AuthGuard } from '@/api/middleware/auth.guard'
import { ConfigService } from '@/api/services/config.service'
import { IServiceRepository, IUserRepository } from '@/data/repositories'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { UserStatus } from '@/types/models/user'
import {
    validateImage,
    validateSvg,
    MAX_IMAGE_BYTES,
} from '@/lib/imageValidation'
import { createLoggerMock } from '../../mocks/logger.provider.mock'
import { createUserFixture } from '../../fixtures/user.stub'
import { createServiceFixture } from '../../fixtures/service.stub'

const svg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill="#fff" d="M0 0h32v32H0z"/></svg>'
)

jest.mock('sharp', () => ({
    __esModule: true,
    default: jest.requireActual('sharp'),
}))

describe('Image file validation', () => {
    it('accepts and re-serializes a static SVG', async () => {
        const result = await validateImage('test.svg', 'image/svg+xml', svg)
        expect(result.toString()).toContain(
            '<svg xmlns="http://www.w3.org/2000/svg"'
        )
        expect(result.toString()).toContain('<path')
    })

    it.each([
        '<script>alert(1)</script>',
        '<foreignObject><div>html</div></foreignObject>',
        '<image href="https://evil.invalid/track"/>',
        '<path onclick="alert(1)"/>',
        '<style>path{fill:url(https://evil.invalid)}</style>',
        '<use href="javascript:alert(1)"/>',
        '<path fill="url(https://evil.invalid)"/>',
        '<path fill="url(&#x68;ttps://evil.invalid)"/>',
        '<path style="fill:red"/>',
        '<animate attributeName="href"/>',
        '<use href="//evil.invalid/x"/>',
        '<path xmlns="http://www.w3.org/1999/xhtml"/>',
        '<path unknown="x"/>',
    ])('rejects active, external, or unapproved SVG content: %s', (content) => {
        expect(() =>
            validateSvg(
                Buffer.from(
                    `<svg xmlns="http://www.w3.org/2000/svg">${content}</svg>`
                )
            )
        ).toThrow(BadRequestException)
    })

    it.each([
        '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg xmlns="http://www.w3.org/2000/svg">&x;</svg>',
        '<?xml-stylesheet href="https://evil.invalid/style.css"?><svg xmlns="http://www.w3.org/2000/svg"/>',
        '<svg xmlns="http://www.w3.org/2000/svg"><path></svg>',
        '<html>not an image</html>',
    ])('rejects DTDs, processing instructions, and malformed XML', (source) => {
        expect(() => validateSvg(Buffer.from(source))).toThrow(
            BadRequestException
        )
    })

    it('rejects deeply nested SVG and oversized dimensions', () => {
        expect(() =>
            validateSvg(
                Buffer.from(
                    `<svg xmlns="http://www.w3.org/2000/svg">${'<g>'.repeat(40)}${'</g>'.repeat(40)}</svg>`
                )
            )
        ).toThrow(BadRequestException)
        expect(() =>
            validateSvg(
                Buffer.from(
                    '<svg xmlns="http://www.w3.org/2000/svg" width="999999"/>'
                )
            )
        ).toThrow(BadRequestException)
    })

    it('fully decodes and re-encodes a PNG without metadata', async () => {
        const input = await sharp({
            create: { width: 2, height: 2, channels: 4, background: '#abcdef' },
        })
            .withMetadata()
            .png()
            .toBuffer()
        const result = await validateImage('test.png', 'image/png', input)
        const metadata = await sharp(result).metadata()
        expect(metadata.format).toBe('png')
        expect(metadata.width).toBe(2)
        expect(metadata.exif).toBeUndefined()
        expect(metadata.icc).toBeUndefined()
    })

    it('rejects PNG trailing payloads, corruption, and excessive pixel counts', async () => {
        const png = await sharp({
            create: { width: 2, height: 2, channels: 4, background: '#fff' },
        })
            .png()
            .toBuffer()
        await expect(
            validateImage(
                'x.png',
                'image/png',
                Buffer.concat([png, Buffer.from('<script/>')])
            )
        ).rejects.toThrow(BadRequestException)
        await expect(
            validateImage('x.png', 'image/png', png.subarray(0, 30))
        ).rejects.toThrow(BadRequestException)
        const large = await sharp({
            create: {
                width: 2500,
                height: 2500,
                channels: 3,
                background: '#fff',
            },
        })
            .png()
            .toBuffer()
        await expect(
            validateImage('x.png', 'image/png', large)
        ).rejects.toThrow(BadRequestException)
    })

    it.each([
        '../test.svg',
        '..\\test.svg',
        '/test.svg',
        'test.svg.png',
        'test.exe',
        'test.SVG',
        '.hidden.svg',
        'CON.svg',
        'nul.png',
    ])('rejects unsafe filenames: %s', async (name) => {
        await expect(validateImage(name, 'image/svg+xml', svg)).rejects.toThrow(
            BadRequestException
        )
    })

    it('rejects MIME mismatches, forged PNGs and oversized input', async () => {
        await expect(validateImage('x.svg', 'image/png', svg)).rejects.toThrow(
            BadRequestException
        )
        await expect(validateImage('x.png', 'image/png', svg)).rejects.toThrow(
            BadRequestException
        )
        await expect(
            validateImage(
                'x.png',
                'image/png',
                Buffer.alloc(MAX_IMAGE_BYTES + 1)
            )
        ).rejects.toThrow(BadRequestException)
    })
})

describe('Image library filesystem operations', () => {
    let fixture: string
    let library: ImageLibraryService
    let services: { findMany: jest.Mock }
    let config: {
        getImageLibraryConfig: () => {
            directory: string
            seedDirectory: string
            baseUrl: string
        }
    }
    const upload = () =>
        library.upload({
            name: 'test.svg',
            mimeType: 'image/svg+xml',
            content: svg.toString('base64'),
        })

    beforeEach(async () => {
        const cache = resolve(process.cwd(), '../node_modules/.cache')
        await mkdir(cache, { recursive: true })
        fixture = await mkdtemp(resolve(cache, 'image-tests-'))
        await mkdir(resolve(fixture, 'images'))
        services = { findMany: jest.fn().mockResolvedValue([]) }
        config = {
            getImageLibraryConfig: () => ({
                directory: resolve(fixture, 'images'),
                seedDirectory: resolve(fixture, 'seed/images'),
                baseUrl: 'https://homegate.example/',
            }),
        }
        library = new ImageLibraryService(
            config as unknown as ConfigService,
            services as unknown as IServiceRepository,
            createLoggerMock() as unknown as LoggingProvider
        )
    })

    afterEach(async () => {
        await rm(fixture, { recursive: true, force: true })
    })

    it('lists uploaded images, prevents overwrites, and hard deletes unused images', async () => {
        await upload()
        expect(await library.list()).toEqual([
            expect.objectContaining({
                name: 'test.svg',
                url: '/images/test.svg',
            }),
        ])
        await expect(upload()).rejects.toThrow(ConflictException)
        expect(await readFile(resolve(library.directory, 'test.svg'))).toEqual(
            validateSvg(svg)
        )
        await library.remove('test.svg')
        expect(await library.list()).toEqual([])
        await expect(library.getImage('test.svg')).rejects.toThrow(
            NotFoundException
        )
    })

    it('does not write rejected content and cannot read or delete outside the directory', async () => {
        await expect(
            library.upload({
                name: 'bad.svg',
                mimeType: 'image/svg+xml',
                content: Buffer.from('<script/>').toString('base64'),
            })
        ).rejects.toThrow(BadRequestException)
        expect(
            (await readdir(library.directory)).filter(
                (name) => !name.startsWith('.')
            )
        ).toEqual([])
        await expect(library.getImage('../secret.svg')).rejects.toThrow(
            BadRequestException
        )
        await expect(library.remove('../secret.svg')).rejects.toThrow(
            BadRequestException
        )
    })

    it('protects the logo and images referenced by service URLs', async () => {
        await upload()
        services.findMany.mockResolvedValue([
            createServiceFixture({
                imageUrl: 'https://homegate.example/images/test.svg?v=1',
            }),
        ])
        await expect(library.remove('test.svg')).rejects.toThrow(
            ConflictException
        )
        await library.upload({
            name: 'logo.svg',
            mimeType: 'image/svg+xml',
            content: svg.toString('base64'),
        })
        await expect(library.remove('logo.svg')).rejects.toThrow(
            ConflictException
        )
    })

    it('serializes concurrent writes and leaves no partial upload files', async () => {
        const results = await Promise.allSettled([upload(), upload()])
        expect(
            results.filter((result) => result.status === 'fulfilled')
        ).toHaveLength(1)
        expect(
            results.filter((result) => result.status === 'rejected')
        ).toHaveLength(1)
        expect(
            (await readdir(library.directory)).some((name) =>
                name.startsWith('.upload-')
            )
        ).toBe(false)
        expect(await library.getImage('test.svg')).toEqual(validateSvg(svg))
    })

    it('rejects noncanonical base64 and enforces the library capacity', async () => {
        await expect(
            library.upload({
                name: 'test.svg',
                mimeType: 'image/svg+xml',
                content: svg.toString('base64') + '\n',
            })
        ).rejects.toThrow(BadRequestException)
        const list = jest.spyOn(library, 'list').mockResolvedValue(
            Array.from({ length: 500 }, (_, index) => ({
                name: `${index}.svg`,
                url: `/images/${index}.svg`,
                size: 1,
                updatedAt: '',
                usedBy: [],
                protected: false,
            }))
        )
        await expect(upload()).rejects.toThrow(ConflictException)
        list.mockResolvedValue([
            {
                name: 'large.png',
                url: '/images/large.png',
                size: 100 * 1024 * 1024,
                updatedAt: '',
                usedBy: [],
                protected: false,
            },
        ])
        await expect(upload()).rejects.toThrow(ConflictException)
    })

    it('seeds a persistent directory once and does not restore deleted images on restart', async () => {
        await mkdir(resolve(fixture, 'seed/images'), { recursive: true })
        await writeFile(resolve(fixture, 'seed/images/seed.svg'), svg)
        await library.initialize()
        await library.remove('seed.svg')
        config = {
            getImageLibraryConfig: () => ({
                directory: resolve(fixture, 'images'),
                seedDirectory: resolve(fixture, 'seed/images'),
                baseUrl: 'https://homegate.example/',
            }),
        }
        const restarted = new ImageLibraryService(
            config as unknown as ConfigService,
            services as unknown as IServiceRepository,
            createLoggerMock() as unknown as LoggingProvider
        )
        expect(await restarted.list()).toEqual([])
    })

    it('fails when the configured storage directory does not exist and does not create it', async () => {
        await rm(library.directory, { recursive: true })
        await expect(library.initialize()).rejects.toMatchObject({
            code: 'ENOENT',
        })
        await expect(readdir(library.directory)).rejects.toMatchObject({
            code: 'ENOENT',
        })
    })

    it('protects images referenced by relative URLs and rejects malformed service URLs', async () => {
        await upload()
        services.findMany.mockResolvedValue([
            createServiceFixture({ imageUrl: '/images/test.svg' }),
        ])
        await expect(library.remove('test.svg')).rejects.toThrow(
            ConflictException
        )
        services.findMany.mockResolvedValue([
            createServiceFixture({ imageUrl: 'https://[' }),
        ])
        await expect(library.list()).rejects.toThrow(/Invalid image URL/)
    })

    it('rejects a symlink or directory junction as the image storage root', async () => {
        const target = resolve(fixture, 'outside')
        await mkdir(target)
        await rm(library.directory, { recursive: true })
        await symlink(
            target,
            library.directory,
            process.platform === 'win32' ? 'junction' : 'dir'
        )
        await expect(library.initialize()).rejects.toThrow(/symbolic link/)
    })
})

describe('Image management authorization', () => {
    it.each(['list', 'upload', 'remove'] as const)(
        'requires an active admin for %s',
        async (method) => {
            const users = { findById: jest.fn() }
            const guard = new AuthGuard(
                new Reflector(),
                users as unknown as IUserRepository
            )
            const request = { session: { userId: 'user', destroy: jest.fn() } }
            const context = {
                getHandler: () => ImageLibraryController.prototype[method],
                getClass: () => ImageLibraryController,
                switchToHttp: () => ({ getRequest: () => request }),
            } as unknown as Parameters<typeof guard.canActivate>[0]
            users.findById.mockResolvedValue(
                createUserFixture({ isAdmin: false })
            )
            expect(await guard.canActivate(context)).toBe(false)
            users.findById.mockResolvedValue(
                createUserFixture({
                    isAdmin: true,
                    status: UserStatus.DISABLED,
                })
            )
            expect(await guard.canActivate(context)).toBe(false)
            users.findById.mockResolvedValue(
                createUserFixture({ isAdmin: true })
            )
            expect(await guard.canActivate(context)).toBe(true)
            users.findById.mockResolvedValue(null)
            expect(await guard.canActivate(context)).toBe(false)
        }
    )
})
