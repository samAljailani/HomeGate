import { ApiProperty } from '@nestjs/swagger'
import { IsInt, IsNotEmpty, IsString } from 'class-validator'

export class ServiceLoadRequestDto {
    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    id: number;
}

export class ServiceCreateRequestDto {
    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    auth_scheme_id: number;
}

export class ServiceUpdateRequestDto {
    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    id: number;

    @ApiProperty({ type: String, required: false })
    @IsString()
    name?: string;

    @ApiProperty({ type: Number, required: false })
    @IsInt()
    auth_scheme_id?: number;
}

export class ServiceDeleteRequestDto {
    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    id: number;
}

export class ServiceFilterOptions {
    id?: number;
    name?: string;
    auth_scheme_id?: number;
}

export class ServiceResponseDto {
    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    id: number;

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    auth_scheme_id: number;
}
