import type { ReactNode } from 'react'
import { Toaster } from '@/components/ui/toast'
import { PreferencesProvider } from '@/context/preferences-context'
import { config } from '@/constants/app'
import { preferences } from '@/constants/preferences'
import '@/styles/index.css'

export const metadata = {
    title: config.appName,
}

// Inline script to apply theme before first paint, preventing flash
const themeScript = `(function(){try{var p=JSON.parse(localStorage.getItem('${preferences.storageKey}'));var t=p&&p.theme;if(t==='light')document.documentElement.classList.remove('dark');else if(t==='dark')document.documentElement.classList.add('dark');else{if(window.matchMedia('(prefers-color-scheme:dark)').matches)document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark')}}catch(e){}})();`

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeScript }} />
            </head>
            <body>
                <PreferencesProvider>
                    <div className="app">
                        <main className="content">{children}</main>
                    </div>
                    <Toaster />
                </PreferencesProvider>
            </body>
        </html>
    )
}
