import type { NestExpressApplication } from '@nestjs/platform-express'
import { json, urlencoded, type RequestHandler } from 'express'

export function configureRequestBodyParsing(
    app: NestExpressApplication,
    imagePath: string,
    authorizeImages: RequestHandler,
    imageLimit: number
): void {
    // Nest detects parsers by function name, even when mounted on a single path.
    // Register both explicitly with Nest's automatic body parsing disabled.
    app.use(imagePath, authorizeImages, json({ limit: imageLimit, strict: true }))
    app.use(json())
    app.use(urlencoded({ extended: true }))
}
