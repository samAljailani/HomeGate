import type { ReactNode } from 'react'
import NavBar from '@/components/layouts/NavBar'
import '@/styles/index.css'

export const metadata = {
  title: 'HomeGate',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <NavBar />
      <div className="mx-auto max-w-screen px-4">
        {children}
      </div>
    </div>
  )
}

