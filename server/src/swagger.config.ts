import { DocumentBuilder } from '@nestjs/swagger'

/**
 * Shared Swagger/OpenAPI document config, used both by the live /api docs UI (main.ts) and by
 * the standalone OpenAPI generation tool (tools/generate-openapi.ts).
 */
export function buildSwaggerConfig() {
    return new DocumentBuilder()
        .setTitle('HomeGate API')
        .setDescription('API documentation for HomeGate')
        .setVersion('1.0')
        .addApiKey(
            {
                type: 'apiKey',
                name: 'X-CSRF-Token',
                in: 'header',
                description: 'CSRF token from GET /api/csrf',
            },
            'csrf-token'
        )
        .addSecurityRequirements('csrf-token')
        .build()
}
