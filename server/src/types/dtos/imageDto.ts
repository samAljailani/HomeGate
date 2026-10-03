import { ApiProperty } from '@nestjs/swagger'
import { IsIn, IsString, Matches, MaxLength } from 'class-validator'
import { IMAGE_NAME, MAX_IMAGE_BYTES } from '@/lib/imageValidation'

export class ImageUploadDto {
    @ApiProperty({ type: String })
    @IsString()
    @Matches(IMAGE_NAME)
    name: string

    @ApiProperty({ type: String, enum: ['image/png', 'image/svg+xml'] })
    @IsIn(['image/png', 'image/svg+xml'])
    mimeType: string

    @ApiProperty({
        type: String,
        description: 'Canonical base64 file content, without a data URL prefix',
    })
    @IsString()
    @MaxLength(Math.ceil(MAX_IMAGE_BYTES / 3) * 4)
    content: string
}

export class ImageResponseDto {
    @ApiProperty({ type: String }) name: string
    @ApiProperty({ type: String }) url: string
    @ApiProperty({ type: Number }) size: number
    @ApiProperty({ type: String }) updatedAt: string
    @ApiProperty({ type: [String] }) usedBy: string[]
    @ApiProperty({ type: Boolean }) protected: boolean
}
