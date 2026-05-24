import { ApiProperty } from '@nestjs/swagger'
import { AuthSchemeName } from '@prisma/generated';
import { IsEnum, IsInt, IsNotEmpty } from 'class-validator'

export class AuthSchemeLoadRequestDto {
    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    id: number;
}

export class AuthSchemeFilterOptions {
    id?: number;
    name?: AuthSchemeName;
}

export class AuthSchemeResponseDto {
    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    id: number;

    @ApiProperty({ enum: AuthSchemeName })
    @IsEnum(AuthSchemeName)
    @IsNotEmpty()
    name: AuthSchemeName;
}