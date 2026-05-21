import { ApiProperty } from '@nestjs/swagger'
import { IsInt, IsNotEmpty, IsString } from 'class-validator'

export class OAuthProviderLoadRequestDto {
    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    id: number;
}

export class OAuthProviderFilterOptions {
    id?: number;
    name?: string;
}

export class OAuthProviderResponseDto {
    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    id: number;

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    name: string;
}
