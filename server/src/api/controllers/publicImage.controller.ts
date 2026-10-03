import { Controller, Get, Inject, Param, Res } from '@nestjs/common'
import type { Response } from 'express'
import { Public } from '@/decorators'
import { ImageLibraryService } from '@/api/services/imageLibrary.service'

/** Service thumbnails are public; management remains exclusively admin-only. */
@Controller('images')
export class PublicImageController {
    constructor(
        @Inject(ImageLibraryService)
        private readonly images: ImageLibraryService
    ) {}

    @Public()
    @Get(':name')
    async get(
        @Param('name') name: string,
        @Res() response: Response
    ): Promise<void> {
        const content = await this.images.getImage(name)
        response.setHeader(
            'Content-Type',
            name.endsWith('.svg') ? 'image/svg+xml' : 'image/png'
        )
        response.setHeader('X-Content-Type-Options', 'nosniff')
        response.setHeader(
            'Content-Security-Policy',
            "sandbox; default-src 'none'; style-src 'unsafe-inline'"
        )
        response.setHeader('Cache-Control', 'no-cache')
        response.send(content)
    }
}
