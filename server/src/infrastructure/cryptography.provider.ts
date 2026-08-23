import { createHash, createPublicKey, createVerify, randomBytes, randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'

@Injectable()
export class CryptographyProvider {
    constructor() {}

    RandomUUID() {
        {
            return randomUUID()
        }
    }

    HashSha256(value: string) {
        return createHash('Sha256').update(value).digest()
    }

    GenerateRandomToken(byteLength: number = 32): string {
        return randomBytes(byteLength).toString('hex')
    }

    verifySha256Signature(value: string, encryptedValue: string, publicKey: string) {
        const publicKeyBuffer = Buffer.from(publicKey, 'base64')
        const cryptoPublicKey = createPublicKey({
            key: publicKeyBuffer,
            type: 'spki',
            format: 'pem',
        })

        const verifier = createVerify('SHA256')
        verifier.update(value)
        verifier.end()
        const encryptedValueBuffer = Buffer.from(encryptedValue, 'base64')
        return verifier.verify(cryptoPublicKey, encryptedValueBuffer)
    }
}
