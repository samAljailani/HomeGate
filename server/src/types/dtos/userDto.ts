import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean, IsDate, IsEmail, IsNotEmpty, IsString, IsUUID } from 'class-validator'

export class UserFindOptions {
    withDeleted?: boolean
    withActive?: boolean
}

export class UserLoadRequestDto {
    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    userId: string
}

export class UserCreateRequestDto {
    @ApiProperty({ type: String })
    @IsEmail()
    @IsNotEmpty()
    email: string

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    firstName: string

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    lastName: string
}

export class UserResponseDto {
    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    id: string

    @ApiProperty({ type: String })
    @IsEmail()
    @IsNotEmpty()
    email: string

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    username: string

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    firstName: string

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    lastName: string

    @ApiProperty({ type: Boolean })
    @IsBoolean()
    isAdmin: boolean
}

export class UserUpdateRequestDto {
    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    userId: string

    @ApiProperty({ type: String, required: false })
    @IsString()
    firstName?: string

    @ApiProperty({ type: String, required: false })
    @IsString()
    lastName?: string

    @ApiProperty({ type: String, required: false })
    @IsString()
    username?: string
}

export class UserDeleteRequestDto {
    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    userId: string

    @ApiProperty({ type: Boolean })
    @IsBoolean()
    softDelete: boolean
}

export class UserResponseForAdminDto extends UserResponseDto {
    @ApiProperty({ type: Boolean })
    @IsBoolean()
    isDeleted: boolean

    @ApiProperty({ type: Boolean })
    @IsBoolean()
    isEnabled: boolean

    @ApiProperty({ type: Date })
    @IsDate()
    createdAt: Date
}
