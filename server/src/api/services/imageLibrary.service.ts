import {
    BadRequestException,
    ConflictException,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common'
import { existsSync, constants } from 'node:fs'
import {
    mkdir,
    lstat,
    readdir,
    realpath,
    open,
    unlink,
    link,
} from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { EnvRepository } from '@/data/repositories/env.repository'
import { IServiceRepository } from '@/data/repositories'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import {
    IMAGE_NAME,
    MAX_IMAGE_BYTES,
    validateImage,
} from '@/lib/imageValidation'
import { ImageResponseDto, ImageUploadDto } from '@/types/dtos/imageDto'

@Injectable()
export class ImageLibraryService {
    readonly directory: string
    private readonly seedDirectory: string
    private ready: Promise<void> | undefined
    private mutations: Promise<unknown> = Promise.resolve()

    constructor(
        @Inject(EnvRepository) env: EnvRepository,
        @Inject(IServiceRepository)
        private readonly services: IServiceRepository,
        @Inject(LoggingProvider) private readonly logger: LoggingProvider
    ) {
        this.seedDirectory = resolve(
            process.cwd(),
            env.getEnv().client.buildPath,
            'images'
        )
        const sourceDirectory = resolve(
            process.cwd(),
            '../client/public/images'
        )
        this.directory = resolve(
            process.env['IMAGE_STORAGE_PATH'] ||
                (existsSync(sourceDirectory)
                    ? sourceDirectory
                    : this.seedDirectory)
        )
    }

    initialize(): Promise<void> {
        this.ready ??= this.prepareDirectory()
        return this.ready
    }

    private async prepareDirectory(): Promise<void> {
        await mkdir(this.directory, { recursive: true, mode: 0o750 })
        const stat = await lstat(this.directory)
        const actual = await realpath(this.directory)
        const samePath =
            process.platform === 'win32'
                ? actual.toLowerCase() === this.directory.toLowerCase()
                : actual === this.directory
        if (!stat.isDirectory() || stat.isSymbolicLink() || !samePath)
            throw new Error(
                'Image storage must be a real directory, not a symbolic link.'
            )
        // A persistent volume is seeded once. Deleted images must not reappear on restart.
        if (
            process.env['IMAGE_STORAGE_PATH'] &&
            this.directory !== this.seedDirectory
        ) {
            const marker = resolve(this.directory, '.initialized')
            if (!existsSync(marker)) {
                if (existsSync(this.seedDirectory)) {
                    for (const entry of await readdir(this.seedDirectory, {
                        withFileTypes: true,
                    })) {
                        if (!entry.isFile() || !IMAGE_NAME.test(entry.name))
                            continue
                        const source = await this.readFile(
                            this.seedDirectory,
                            entry.name
                        )
                        try {
                            await this.writeNew(entry.name, source)
                        } catch (error) {
                            if (!(error instanceof ConflictException))
                                throw error
                        }
                    }
                }
                const handle = await open(marker, 'wx', 0o640)
                await handle.close()
            }
        }
    }

    private filename(name: string): string {
        if (!IMAGE_NAME.test(name))
            throw new BadRequestException('Invalid image filename.')
        return resolve(this.directory, name)
    }

    private async readFile(directory: string, name: string): Promise<Buffer> {
        const path = resolve(directory, name)
        const stat = await lstat(path)
        if (
            !stat.isFile() ||
            stat.isSymbolicLink() ||
            stat.size > MAX_IMAGE_BYTES
        )
            throw new BadRequestException('Invalid image file.')
        const handle = await open(
            path,
            constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0)
        )
        try {
            const opened = await handle.stat()
            if (!opened.isFile() || opened.size > MAX_IMAGE_BYTES)
                throw new BadRequestException('Invalid image file.')
            return await handle.readFile()
        } finally {
            await handle.close()
        }
    }

    private async writeNew(name: string, content: Buffer): Promise<void> {
        const destination = this.filename(name)
        const temporary = resolve(this.directory, `.upload-${randomUUID()}`)
        try {
            const handle = await open(temporary, 'wx', 0o640)
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
                throw new ConflictException(
                    'An image with this name already exists. Choose a different name.'
                )
            throw error
        } finally {
            await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
                if (error.code !== 'ENOENT') throw error
            })
        }
    }

    async list(): Promise<ImageResponseDto[]> {
        await this.initialize()
        const services = await this.services.findMany(
            {},
            Number.MAX_SAFE_INTEGER
        )
        const images: ImageResponseDto[] = []
        for (const entry of await readdir(this.directory, {
            withFileTypes: true,
        })) {
            if (!entry.isFile() || !IMAGE_NAME.test(entry.name)) continue
            const stat = await lstat(this.filename(entry.name))
            if (!stat.isFile() || stat.isSymbolicLink()) continue
            const url = `/images/${entry.name}`
            const usedBy = services
                .filter((service) => {
                    try {
                        return (
                            service.imageUrl != null &&
                            decodeURIComponent(
                                new URL(
                                    service.imageUrl,
                                    'https://homegate.invalid'
                                ).pathname
                            ) === url
                        )
                    } catch {
                        return false
                    }
                })
                .map((service) => service.name)
            images.push({
                name: entry.name,
                url,
                size: stat.size,
                updatedAt: stat.mtime.toISOString(),
                usedBy,
                protected: entry.name.toLowerCase() === 'logo.svg',
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
            if ((error as NodeJS.ErrnoException).code === 'ENOENT')
                throw new NotFoundException('Image not found.')
            throw error
        }
    }

    upload(request: ImageUploadDto): Promise<ImageResponseDto> {
        return this.exclusive(async () => {
            await this.initialize()
            this.filename(request.name)
            if (request.content.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4)
                throw new BadRequestException('Image exceeds the 2 MB limit.')
            const buffer = Buffer.from(request.content, 'base64')
            if (buffer.toString('base64') !== request.content)
                throw new BadRequestException('Invalid base64 file content.')
            const clean = await validateImage(
                request.name,
                request.mimeType,
                buffer
            )
            const images = await this.list()
            if (
                images.length >= 500 ||
                images.reduce(
                    (total, image) => total + image.size,
                    clean.length
                ) >
                    100 * 1024 * 1024
            ) {
                throw new ConflictException(
                    'Image library is full. Delete unused images before uploading more.'
                )
            }
            await this.writeNew(request.name, clean)
            this.logger.log(
                `Uploaded image '${request.name}' (${clean.length} bytes)`
            )
            return {
                name: request.name,
                url: `/images/${request.name}`,
                size: clean.length,
                updatedAt: new Date().toISOString(),
                usedBy: [],
                protected: request.name.toLowerCase() === 'logo.svg',
            }
        })
    }

    remove(name: string): Promise<void> {
        return this.exclusive(async () => {
            this.filename(name)
            const image = (await this.list()).find(
                (entry) => entry.name === name
            )
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
