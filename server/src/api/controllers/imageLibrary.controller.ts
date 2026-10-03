import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    Inject,
    Param,
    Post,
} from '@nestjs/common'
import {
    ApiBody,
    ApiCreatedResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { AdminRoute } from '@/decorators'
import { ImageLibraryService } from '@/api/services/imageLibrary.service'
import { ImageResponseDto, ImageUploadDto } from '@/types/dtos/imageDto'
import { routes } from '@/types/dtos/routes'

@ApiTags('Images')
@AdminRoute()
@Controller(routes.images.basePath)
export class ImageLibraryController {
    constructor(
        @Inject(ImageLibraryService)
        private readonly images: ImageLibraryService
    ) {}

    @Get()
    @ApiOperation({ summary: 'List public images (admin only)' })
    @ApiOkResponse({ type: [ImageResponseDto] })
    list(): Promise<ImageResponseDto[]> {
        return this.images.list()
    }

    @Post()
    @Throttle({ default: { ttl: 60_000, limit: 10 } })
    @ApiOperation({
        summary: 'Upload a validated static PNG or SVG (admin only)',
    })
    @ApiBody({ type: ImageUploadDto })
    @ApiCreatedResponse({ type: ImageResponseDto })
    upload(@Body() request: ImageUploadDto): Promise<ImageResponseDto> {
        return this.images.upload(request)
    }

    @Delete(':name')
    @HttpCode(204)
    @Throttle({ default: { ttl: 60_000, limit: 10 } })
    @ApiOperation({ summary: 'Delete an unused public image (admin only)' })
    remove(@Param('name') name: string): Promise<void> {
        return this.images.remove(name)
    }
}
