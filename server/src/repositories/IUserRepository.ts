import { UserModel } from '@prisma/generated/models';
import { UserCreateRequestDto, UserDeleteRequestDto, UserFilterOptions, UserLoadRequestDto, UserUpdateRequestDto } from '@/types/dtos/userDto';

export const IUserRepository = Symbol('IUserRepository');

export interface IUserRepository {
    get(request: UserLoadRequestDto): Promise<UserModel | null>;
    getUserByEmail(email: string): Promise<UserModel | null>;
    getMany(filter: UserFilterOptions, take?: number): Promise<UserModel[]>;
    post(request: UserCreateRequestDto): Promise<UserModel | null>;
    put(request: UserUpdateRequestDto): Promise<UserModel | null>;
    delete(request: UserDeleteRequestDto): Promise<void>;
    existsByUsername(username: string): Promise<boolean>;
}
