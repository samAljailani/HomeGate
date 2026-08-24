import type { ReactNode } from 'react'
import NavBar from '@/components/layouts/NavBar'
import { AuthProvider } from '@/context/auth-context'
import '@/styles/index.css'

export const metadata = {
  title: 'HomeGate',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <div>
        <NavBar />
        <div className="mx-auto max-w-screen px-2 sm:px-4">
          {children}
        </div>
      </div>
    </AuthProvider>
  )
}

