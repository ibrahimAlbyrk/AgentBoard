import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
      <div className="text-center max-w-md space-y-6">
        <h1 className="text-7xl font-bold text-[var(--accent-solid)]">404</h1>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Page not found</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <Button asChild className="bg-gradient-to-r from-[var(--accent-solid)] to-[var(--accent-solid-hover)] text-white">
          <Link to="/dashboard">
            <Home className="size-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  )
}
