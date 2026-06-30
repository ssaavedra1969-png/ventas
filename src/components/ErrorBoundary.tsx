'use client'

import { Component } from 'react'
import { logger } from '@/lib/logger'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error('ErrorBoundary', 'Uncaught error', {
      error: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex items-center justify-center min-h-screen p-8">
          <div className="max-w-md w-full glass-card rounded-2xl p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">Algo salió mal</h2>
            <p className="text-sm text-[#B0B0D0]">
              Ocurrió un error inesperado. Revisá la consola para más detalles.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre className="text-xs text-left text-red-300 bg-red-950/30 rounded-xl p-4 overflow-auto max-h-40 font-mono">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="btn-nebula inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium"
            >
              Recargar página
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
