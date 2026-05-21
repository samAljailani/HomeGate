import { ApiProperty } from '@nestjs/swagger'
import { IsInt, IsNotEmpty, IsString } from 'class-validator'

export class AuthSchemeLoadRequestDto {
    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    id: number;
}

export class AuthSchemeFilterOptions {
    id?: number;
    name?: string;
}

export class AuthSchemeResponseDto {
    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    id: number;

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    name: string;
}
