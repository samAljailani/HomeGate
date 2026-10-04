import { Body, Controller, Patch, Post, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { configureRequestBodyParsing } from '@/api/security/requestBody'
import { ServicePatchRequestDto } from '@/types/dtos/serviceDto'
import { SubscriptionCreateRequestDto } from '@/types/dtos/subscriptionsDto'

@Controller('api')
class RequestBodyController {
    @Patch('services/:slug')
    updateService(@Body() body: ServicePatchRequestDto) {
        return body
    }

    @Post('subscriptions')
    subscribe(@Body() body: SubscriptionCreateRequestDto) {
        return body
    }

    @Post('images')
    upload(@Body() body: Record<string, unknown>) {
        return body
    }
}

describe('Request body parsing and DTO validation', () => {
    let app: NestExpressApplication
    let baseUrl: string

    beforeAll(async () => {
        const module = await Test.createTestingModule({ controllers: [RequestBodyController] }).compile()
        app = module.createNestApplication<NestExpressApplication>({ bodyParser: false, logger: false })
        configureRequestBodyParsing(
            app,
            '/api/images',
            (req, res, next) => {
                if (req.headers['x-test-admin'] !== 'true') {
                    res.status(403).end()
                    return
                }
                next()
            },
            256 * 1024
        )
        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
                transformOptions: { enableImplicitConversion: true },
            })
        )
        await app.listen(0, '127.0.0.1')
        baseUrl = await app.getUrl()
    })

    afterAll(async () => {
        await app.close()
    })

    function send(path: string, body: object, method = 'POST', admin = false) {
        return fetch(`${baseUrl}${path}`, {
            method,
            headers: { 'Content-Type': 'application/json', 'X-Test-Admin': String(admin) },
            body: JSON.stringify(body),
        })
    }

    it('parses and validates service card edits', async () => {
        const body = { slug: 'my-service', enabled: false, url: 'https://service.example.com', imageUrl: null }
        const response = await send('/api/services/my-service', body, 'PATCH')
        expect(response.status).toBe(200)
        expect(await response.json()).toEqual(body)
    })

    it.each([true, false])('accepts signup without credentials and autoRenew=%s', async (autoRenew) => {
        const body = { serviceId: 1, autoRenew }
        const response = await send('/api/subscriptions', body)
        expect(response.status).toBe(201)
        expect(await response.json()).toEqual(body)
    })

    it('still rejects missing subscription identifiers and renewal preferences', async () => {
        expect((await send('/api/subscriptions', {})).status).toBe(400)
    })

    it('still rejects mismatched supplied passwords', async () => {
        const response = await send('/api/subscriptions', {
            serviceId: 1,
            autoRenew: true,
            serviceUsername: 'user',
            servicePassword: 'password1',
            confirmServicePassword: 'password2',
        })
        expect(response.status).toBe(400)
    })

    it('allows larger image bodies after authorization', async () => {
        const body = { content: 'a'.repeat(128 * 1024) }
        const response = await send('/api/images', body, 'POST', true)
        expect(response.status).toBe(201)
        expect(await response.json()).toEqual(body)
    })

    it('keeps the default body limit on other routes', async () => {
        const response = await send('/api/subscriptions', { content: 'a'.repeat(128 * 1024) })
        expect(response.status).toBe(413)
    })

    it('authorizes image requests before parsing their bodies', async () => {
        const response = await send('/api/images', { content: 'a'.repeat(300 * 1024) })
        expect(response.status).toBe(403)
    })
})
