import { ApiProperty } from '@nestjs/swagger'
import { OAuthProviderName } from '@prisma/generated';
import { IsEnum, IsInt, IsNotEmpty } from 'class-validator'

export class OAuthProviderLoadRequestDto {
    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    id: number;
}

export class OAuthProviderFilterOptions {
    id?: number;
    name?: OAuthProviderName;
}

export class OAuthProviderResponseDto {
    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    id: number;

    @ApiProperty({ enum: OAuthProviderName })
    @IsEnum(OAuthProviderName)
    @IsNotEmpty()
    name: OAuthProviderName;
}
