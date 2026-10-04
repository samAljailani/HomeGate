import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { existsSync, constants } from 'node:fs'
import { lstat, readdir, realpath, open, unlink, link } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { ConfigService, type ImageLibraryConfig } from './config.service'
import { IServiceRepository } from '@/data/repositories'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { validateImage } from '@/lib/imageValidation'
import { ImageResponseDto, ImageUploadDto } from '@/types/dtos/imageDto'

@Injectable()
export class ImageLibraryService {
    private readonly settings: ImageLibraryConfig
    readonly directory: string
    private readonly seedDirectory: string
    private readonly baseUrl: string
    private ready: Promise<void> | undefined
    private mutations: Promise<unknown> = Promise.resolve()

    constructor(
        @Inject(ConfigService) config: ConfigService,
        @Inject(IServiceRepository)
        private readonly services: IServiceRepository,
        @Inject(LoggingProvider) private readonly logger: LoggingProvider
    ) {
        const settings = config.getImageLibraryConfig()
        this.settings = settings
        this.seedDirectory = settings.seedDirectory
        this.directory = settings.directory
        this.baseUrl = settings.baseUrl
    }

    initialize(): Promise<void> {
        this.ready ??= this.prepareDirectory()
        return this.ready
    }

    private async prepareDirectory(): Promise<void> {
        const stat = await lstat(this.directory)
        const actual = await realpath(this.directory)
        const samePath =
            process.platform === 'win32'
                ? actual.toLowerCase() === this.directory.toLowerCase()
                : actual === this.directory
        if (!stat.isDirectory() || stat.isSymbolicLink() || !samePath)
            throw new Error('Image storage must be a real directory, not a symbolic link.')
        // A persistent volume is seeded once. Deleted images must not reappear on restart.
        if (this.directory !== this.seedDirectory) {
            const marker = resolve(this.directory, this.settings.initializationMarker)
            if (!existsSync(marker)) {
                if (existsSync(this.seedDirectory)) {
                    for (const entry of await readdir(this.seedDirectory, {
                        withFileTypes: true,
                    })) {
                        if (!entry.isFile() || !this.settings.filenamePattern.test(entry.name)) continue
                        const source = await this.readFile(this.seedDirectory, entry.name)
                        try {
                            await this.writeNew(entry.name, source)
                        } catch (error) {
                            if (!(error instanceof ConflictException)) throw error
                        }
                    }
                }
                const handle = await open(marker, 'wx', this.settings.fileMode)
                await handle.close()
            }
        }
    }

    private filename(name: string): string {
        if (!this.settings.filenamePattern.test(name)) throw new BadRequestException('Invalid image filename.')
        return resolve(this.directory, name)
    }

    private async readFile(directory: string, name: string): Promise<Buffer> {
        const path = resolve(directory, name)
        const stat = await lstat(path)
        // The size limit applies to new uploads. Bundled images may be larger.
        if (!stat.isFile() || stat.isSymbolicLink()) throw new BadRequestException('Invalid image file.')
        const handle = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
        try {
            const opened = await handle.stat()
            if (!opened.isFile()) throw new BadRequestException('Invalid image file.')
            return await handle.readFile()
        } finally {
            await handle.close()
        }
    }

    private async writeNew(name: string, content: Buffer): Promise<void> {
        const destination = this.filename(name)
        const temporary = resolve(this.directory, `.upload-${randomUUID()}`)
        try {
            const handle = await open(temporary, 'wx', this.settings.fileMode)
            try {
                await handle.writeFile(content)
                await handle.sync()
            } finally {
                await handle.close()
            }
            // Publish only a complete file. link() is atomic and refuses overwrites.
            await link(temporary, destination)
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'EEXIST')
                throw new ConflictException('An image with this name already exists. Choose a different name.')
            throw error
        } finally {
            await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
                if (error.code !== 'ENOENT') throw error
            })
        }
    }

    async list(): Promise<ImageResponseDto[]> {
        await this.initialize()
        const services = await this.services.findMany({}, Number.MAX_SAFE_INTEGER)
        const images: ImageResponseDto[] = []
        for (const entry of await readdir(this.directory, {
            withFileTypes: true,
        })) {
            if (!entry.isFile() || !this.settings.filenamePattern.test(entry.name)) continue
            const stat = await lstat(this.filename(entry.name))
            if (!stat.isFile() || stat.isSymbolicLink()) continue
            const url = `${this.settings.publicPath}/${entry.name}`
            const usedBy = services
                .filter((service) => {
                    try {
                        return (
                            service.imageUrl != null &&
                            decodeURIComponent(new URL(service.imageUrl, this.baseUrl).pathname) === url
                        )
                    } catch {
                        throw new Error(`Invalid image URL for service '${service.name}'.`)
                    }
                })
                .map((service) => service.name)
            images.push({
                name: entry.name,
                url,
                size: stat.size,
                updatedAt: stat.mtime.toISOString(),
                usedBy,
                protected: this.settings.protectedNames.includes(entry.name.toLowerCase()),
            })
        }
        return images.sort((a, b) => a.name.localeCompare(b.name))
    }

    private exclusive<T>(action: () => Promise<T>): Promise<T> {
        const result = this.mutations.then(action)
        this.mutations = result.catch(() => undefined)
        return result
    }

    async getImage(name: string): Promise<Buffer> {
        this.filename(name)
        await this.initialize()
        try {
            return await this.readFile(this.directory, name)
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new NotFoundException('Image not found.')
            throw error
        }
    }

    upload(request: ImageUploadDto): Promise<ImageResponseDto> {
        return this.exclusive(async () => {
            await this.initialize()
            this.filename(request.name)
            if (request.content.length > this.settings.maxBase64Length)
                throw new BadRequestException(
                    `Image exceeds the ${this.settings.maxImageBytes / (1024 * 1024)} MB limit.`
                )
            const buffer = Buffer.from(request.content, 'base64')
            if (buffer.toString('base64') !== request.content)
                throw new BadRequestException('Invalid base64 file content.')
            const clean = await validateImage(request.name, request.mimeType, buffer, this.settings)
            const images = await this.list()
            if (
                images.length >= this.settings.maxImages ||
                images.reduce((total, image) => total + image.size, clean.length) > this.settings.maxLibraryBytes
            ) {
                throw new ConflictException('Image library is full. Delete unused images before uploading more.')
            }
            await this.writeNew(request.name, clean)
            this.logger.log(`Uploaded image '${request.name}' (${clean.length} bytes)`)
            return {
                name: request.name,
                url: `${this.settings.publicPath}/${request.name}`,
                size: clean.length,
                updatedAt: new Date().toISOString(),
                usedBy: [],
                protected: this.settings.protectedNames.includes(request.name.toLowerCase()),
            }
        })
    }

    remove(name: string): Promise<void> {
        return this.exclusive(async () => {
            this.filename(name)
            const image = (await this.list()).find((entry) => entry.name === name)
            if (!image) throw new NotFoundException('Image not found.')
            if (image.protected || image.usedBy.length)
                throw new ConflictException(
                    'This image is used by the app or a service. Update the service image before deleting it.'
                )
            // Read with O_NOFOLLOW before unlinking; uploads never overwrite existing files.
            await this.readFile(this.directory, name)
            await unlink(this.filename(name))
            this.logger.log(`Deleted image '${name}'`)
        })
    }
}
