import { IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class EnvResponse {
    @IsString()
    @Type(() => String)
    CLIENT_RELATIVE_STATIC_PATH: string;

    constructor(CLIENT_RELATIVE_STATIC_PATH: string) {
        this.CLIENT_RELATIVE_STATIC_PATH = CLIENT_RELATIVE_STATIC_PATH;
    }
}