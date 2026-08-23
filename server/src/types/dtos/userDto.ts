import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsBoolean, IsDate, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator'
import { UserStatus } from '@/types/models/user'

export class UserFindOptions {
    withDeleted?: boolean
    withActive?: boolean
}

export class UserParamsDto {
    @ApiProperty({ type: String, format: 'uuid' })
    @IsUUID()
    @IsNotEmpty()
    id: string
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

export class UserPatchRequestDto {
    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsBoolean()
    enabled?: boolean

    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsBoolean()
    admin?: boolean
}

export class UserDeleteRequestDto {
    @ApiPropertyOptional({
        type: Boolean,
        description: 'Permanently delete the account. Ignored for non-admin callers.',
    })
    @IsOptional()
    @Transform(({ value }) => value === true || value === 'true')
    @IsBoolean()
    hard?: boolean
}

export class UserResponseForAdminDto extends UserResponseDto {
    @ApiProperty({ enum: UserStatus })
    @IsIn(Object.values(UserStatus))
    status: UserStatus

    @ApiProperty({ type: Date })
    @IsDate()
    createdAt: Date
}

export class UserStatusCountDto {
    @ApiProperty({ enum: UserStatus })
    status: UserStatus

    @ApiProperty({ type: Number })
    count: number
}

export class UserStatsResponseDto {
    @ApiProperty({
        type: Number,
        example: 42,
        description: 'Total number of users',
    })
    total: number

    @ApiProperty({
        type: () => [UserStatusCountDto],
        description: 'User counts grouped by status',
    })
    byStatus: UserStatusCountDto[]
}