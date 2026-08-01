/**
 * Generates the app's OpenAPI document.
 *
 * Boots the Nest application headlessly (no HTTP listener), builds the same Swagger document
 * used by the live /api docs UI, and writes it to server/openapi.json. The published
 * @samaljailani/homegate-types package (packages/types) consumes this file to generate its
 * TypeScript types via openapi-typescript.
 *
 * Usage:
 *   npx tsx tools/generate-openapi.ts
 */
import 'dotenv/config'
import 'reflect-metadata'

import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { NestFactory } from '@nestjs/core'
import { SwaggerModule } from '@nestjs/swagger'

import { AppModule } from '@/app.module'
import { buildSwaggerConfig } from '@/swagger.config'
import { PaginationRequestDto } from '@/types/dtos/paginationDto'

const OUTPUT_PATH = resolve(__dirname, '../openapi.json')

async function main() {
    const app = await NestFactory.create(AppModule, { logger: false })

    const document = SwaggerModule.createDocument(app, buildSwaggerConfig(), { extraModels: [PaginationRequestDto] })

    writeFileSync(OUTPUT_PATH, JSON.stringify(document, null, 2))

    console.log(`OpenAPI document written to ${OUTPUT_PATH}`)

    await app.close()
}

main().catch((error) => {
    console.error('Failed to generate OpenAPI document', error)
    process.exit(1)
})
