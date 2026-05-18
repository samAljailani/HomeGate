import { Injectable, Inject } from "@nestjs/common";
import { PrismaProvider } from '@/providers/prisma.provider'
import { UserModel } from "@prisma/generated/models";
import { UserLoadRequestDto } from "../../types/dtos/userDto";

@Injectable()
export class UserRepository{
    private db: PrismaProvider;
    constructor(@Inject(PrismaProvider) db: PrismaProvider){
        this.db = db;
    }


    async get(request: UserLoadRequestDto) : Promise<UserModel | null>{
        const user = await this.db.user.findUnique({
            where : {id: request.user_id}
        })

        return user;
    }


}