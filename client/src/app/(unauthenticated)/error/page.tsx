import { Suspense } from 'react'
import { ErrorPage } from '@/views/Error'

export default function ErrorRoute() {
  return (
    <Suspense>
      <ErrorPage />
    </Suspense>
  )
}
