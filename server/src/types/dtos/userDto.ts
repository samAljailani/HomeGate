import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean, IsDate, IsEmail, IsNotEmpty, IsString, IsUUID } from 'class-validator'

export class UserFindOptions {
    withDeleted?: Boolean
    withActive?: Boolean
}

export class UserFilterOptions {
    id?: string
    email?: string
    username?: string
    firstName?: string
    lastName?: string
    isAdmin?: boolean
    isDeleted?: boolean
}

export class UserLoadRequestDto {
    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    userId: string
}

export class UserCreateRequestDto {
    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    password: string

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    username: string

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
    //@ApiProperty({ type: Boolean }) is_admin: boolean;
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

    @ApiProperty({ type: String, required: false })
    @IsString()
    password?: string
}

export class UserDeleteRequestDto {
    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    userId: string
}

export class UserResponseForAdmin extends UserResponseDto {
    @ApiProperty({ type: Boolean })
    @IsBoolean()
    isDeleted: boolean

    @ApiProperty({ type: Date })
    @IsDate()
    createdAt: Date
}
