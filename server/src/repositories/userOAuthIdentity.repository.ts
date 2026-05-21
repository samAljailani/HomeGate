import { Injectable, Inject } from "@nestjs/common";
import { PrismaProvider } from '@/providers/prisma.provider'
import { UserOAuthIdentity } from "@prisma/generated";
import { OAuthIdentityCreateRequestDto, OAuthIdentityDeleteRequestDto, OAuthIdentityFilterOptions, OAuthIdentityLoadRequestDto } from "@/types/dtos/userOAuthIdentityDto";
import { IUserOAuthIdentityRepository } from './IUserOAuthIdentityRepository';

@Injectable()
export class UserOAuthIdentityRepository implements IUserOAuthIdentityRepository {
    private db: PrismaProvider;
    constructor(@Inject(PrismaProvider) db: PrismaProvider){
        this.db = db;
    }


    async get(request: OAuthIdentityLoadRequestDto): Promise<UserOAuthIdentity | null> {
        const user = await this.db.userOAuthIdentity.findUnique({
            where: {
                provider_id_profile_id: {
                    provider_id: request.provider_id,
                    profile_id: request.profile_id,
                }
            }
        });

        return user;
    }
    
    async getMany(filter: OAuthIdentityFilterOptions, take?: number): Promise<UserOAuthIdentity[]> {
        return this.db.userOAuthIdentity.findMany({
            where: { ...filter },
            ...(take !== undefined && { take }),
        });
    }

    async post(request: OAuthIdentityCreateRequestDto): Promise<UserOAuthIdentity | null> {
        const user = await this.db.userOAuthIdentity.create({
            data: { ...request }
        });

        return user;
    }

    async delete(request: OAuthIdentityDeleteRequestDto): Promise<void> {
        await this.db.userOAuthIdentity.delete({
            where: {
                provider_id_profile_id: {
                    provider_id: request.provider_id,
                    profile_id: request.profile_id,
                },
            },
        });
    }

    async existsByProviderAndProfileId(provider_id: number, profile_id: string): Promise<boolean> {
        const count = await this.db.userOAuthIdentity.count({
            where: { provider_id, profile_id },
        });
        return count > 0;
    }

    async getByUsername(username: string): Promise<UserOAuthIdentity[]> {
        return this.db.userOAuthIdentity.findMany({
            where: {
                user: { username },
            },
        });
    }

}