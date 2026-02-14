import { Component, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
        <div className="text-center max-w-md space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="size-8 text-red-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              An unexpected error occurred. Please try again.
            </p>
          </div>
          {this.state.error && (
            <pre className="text-xs text-[var(--text-tertiary)] bg-[var(--elevated)] border border-[var(--border-subtle)] rounded-lg p-3 text-left overflow-auto max-h-32">
              {this.state.error.message}
            </pre>
          )}
          <Button
            onClick={this.handleReset}
            className="bg-gradient-to-r from-[var(--accent-solid)] to-[var(--accent-solid-hover)] text-white"
          >
            <RotateCcw className="size-4 mr-2" />
            Try again
          </Button>
        </div>
      </div>
    )
  }
}
