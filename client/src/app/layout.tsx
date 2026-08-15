import type { ReactNode } from 'react'
import { Toaster } from '@/components/ui/toast'
import { ThemeShortcut } from '@/components/ThemeShortcut'
import { config } from '@/constants/app'
import '@/styles/index.css'

export const metadata = {
    title: config.appName,
}

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en" className="dark">
            <body>
                <div className="app">
                    <main className="content">{children}</main>
                </div>
                <Toaster />
                <ThemeShortcut />
            </body>
        </html>
    )
}
