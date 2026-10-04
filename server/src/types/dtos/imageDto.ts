import { ApiProperty } from '@nestjs/swagger'
import { IsIn, IsString, Matches, MaxLength } from 'class-validator'
import { imageLibraryDefaults } from '@/api/services/config.service'

export class ImageUploadDto {
    @ApiProperty({ type: String })
    @IsString()
    @Matches(imageLibraryDefaults.filenamePattern)
    name: string

    @ApiProperty({ type: String, enum: imageLibraryDefaults.mimeTypes })
    @IsIn(imageLibraryDefaults.mimeTypes)
    mimeType: string

    @ApiProperty({
        type: String,
        description: 'Canonical base64 file content, without a data URL prefix',
    })
    @IsString()
    @MaxLength(Math.ceil(imageLibraryDefaults.maxImageBytes / 3) * 4)
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
