/**
 * Extracts a coarse device class and browser name from a user-agent string.
 * Intentionally lightweight — not a full UA parser; good enough for an admin overview.
 */
export function parseUserAgent(userAgent: string | null | undefined): {
    device: string | null
    browser: string | null
} {
    if (!userAgent) {
        return { device: null, browser: null }
    }

    const ua = userAgent.toLowerCase()

    let device: string | null = null
    if (/mobile|iphone|android.*mobile|windows phone/.test(ua)) {
        device = 'Mobile'
    } else if (/ipad|tablet|android(?!.*mobile)/.test(ua)) {
        device = 'Tablet'
    } else if (/bot|crawler|spider|curl|wget|postman/.test(ua)) {
        device = 'Bot'
    } else {
        device = 'Desktop'
    }

    let browser: string | null = null
    if (ua.includes('edg/')) {
        browser = 'Edge'
    } else if (ua.includes('chrome/') && !ua.includes('chromium')) {
        browser = 'Chrome'
    } else if (ua.includes('firefox/')) {
        browser = 'Firefox'
    } else if (ua.includes('safari/') && !ua.includes('chrome/')) {
        browser = 'Safari'
    } else if (ua.includes('opr/') || ua.includes('opera')) {
        browser = 'Opera'
    }

    return { device, browser }
}
