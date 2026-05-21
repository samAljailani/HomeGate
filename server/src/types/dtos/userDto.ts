import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean, IsDate, IsEmail, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class UserFindOptions{
    withDeleted?: Boolean
    withActive?: Boolean
}

export class UserFilterOptions {
    id?: string;
    email?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
    is_admin?: boolean;
    is_deleted?: boolean;
}

export class UserLoadRequestDto{
    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    user_id: string;
}

export class UserCreateRequestDto{
    @ApiProperty({ type: String })
    @IsString() 
    @IsNotEmpty()
    password: string;

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    username: string;
    
    @ApiProperty({ type: String }) 
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty() 
    first_name: string;

    @ApiProperty({ type: String }) 
    @IsString()
    @IsNotEmpty()
    last_name: string;
    //@ApiProperty({ type: Boolean }) is_admin: boolean;
}

export class UserResponseDto {
    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    id: string;

    @ApiProperty({ type: String })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    first_name: string;

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    last_name: string;

    @ApiProperty({ type: Boolean })
    @IsBoolean()
    is_admin: boolean;
}

export class UserUpdateRequestDto {
    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    user_id: string;

    @ApiProperty({ type: String, required: false })
    @IsString()
    first_name?: string;

    @ApiProperty({ type: String, required: false })
    @IsString()
    last_name?: string;

    @ApiProperty({ type: String, required: false })
    @IsString()
    username?: string;

    @ApiProperty({ type: String, required: false })
    @IsString()
    password?: string;
}

export class UserDeleteRequestDto {
    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    user_id: string;
}

export class UserResponseForAdmin extends UserResponseDto {
    @ApiProperty({ type: Boolean })
    @IsBoolean()
    is_deleted: boolean;

    @ApiProperty({ type: Date })
    @IsDate()
    created_at: Date;
}