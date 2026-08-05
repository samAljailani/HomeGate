'use client'

import { useSearchParams } from 'next/navigation'
import { config } from '@/constants/app'

const messages: Record<string, { title: string; description: string }> = {
  '401': { title: 'Unauthorized', description: 'You need to sign in to access this page.' },
  '403': { title: 'Forbidden', description: 'You do not have permission to access this page.' },
  '404': { title: 'Not Found', description: 'The page you are looking for does not exist.' },
}

export function ErrorPage() {
  const params = useSearchParams()
  const status = params.get('status') ?? '404'
  const { title, description } = messages[status] ?? messages['404']

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-6xl font-bold">{status}</h1>
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="text-muted-foreground">{description}</p>
      {status === '401' && (
        <a href={config.routes.signIn} className="mt-4 underline">
          Go to Sign In
        </a>
      )}
      {status !== '401' && (
        <a href={config.routes.home} className="mt-4 underline">
          Go Home
        </a>
      )}
    </div>
  )
}
