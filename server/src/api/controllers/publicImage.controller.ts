import { Controller, Get, Inject, Param, Res } from '@nestjs/common'
import type { Response } from 'express'
import { Public } from '@/decorators'
import { ImageLibraryService } from '@/api/services/imageLibrary.service'
import { imageLibraryDefaults } from '@/api/services/config.service'

/** Service thumbnails are public; management remains exclusively admin-only. */
@Controller(imageLibraryDefaults.publicPath)
export class PublicImageController {
    constructor(
        @Inject(ImageLibraryService)
        private readonly images: ImageLibraryService
    ) {}

    @Public()
    @Get(':name')
    async get(@Param('name') name: string, @Res() response: Response): Promise<void> {
        const content = await this.images.getImage(name)
        response.setHeader('Content-Type', name.endsWith('.svg') ? 'image/svg+xml' : 'image/png')
        for (const [header, value] of Object.entries(imageLibraryDefaults.responseHeaders)) {
            response.setHeader(header, value)
        }
        response.send(content)
    }
}
