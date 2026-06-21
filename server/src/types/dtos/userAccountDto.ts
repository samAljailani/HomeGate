import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean, IsInt, IsNotEmpty, IsString, IsUUID } from 'class-validator'

export class UserAccountLoadRequestDto {
    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    userId: string

    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    serviceId: number
}

export class UserAccountCreateRequestDto {
    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    userId: string

    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    serviceId: number

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    username: string

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    password: string

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    confirmedPassword: string
}

export class UserAccountUpdateRequestDto {
    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    userId: string

    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    serviceId: number

    @ApiProperty({ type: String, required: false })
    @IsString()
    username?: string

    @ApiProperty({ type: Boolean, required: false })
    @IsBoolean()
    isActive?: boolean
}

export class UserAccountDeleteRequestDto {
    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    userId: string

    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    serviceId: number
}

export class UserAccountResponseDto {
    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    userId: string

    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    serviceId: number

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    username: string

    @ApiProperty({ type: Boolean })
    @IsBoolean()
    isActive: boolean

    @ApiProperty({ type: Date })
    createdAt: Date
}
