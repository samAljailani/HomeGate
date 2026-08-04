import type { ReactNode } from 'react'
import NavBar from '@/layouts/NavBar'
import { Toaster } from '@/components/ui/toast'
import '@/styles/index.css'

export const metadata = {
  title: 'HomeGate',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <div className="app">
          <NavBar />
          <main className="content">
            {children}
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  )
}
