import { Component, type ErrorInfo, type ReactNode } from 'react'
import { withTranslation, type WithTranslation } from 'react-i18next'
import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props extends WithTranslation {
  children: ReactNode
}

interface State {
  error: Error | null
}

class ErrorBoundaryBase extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack)
  }

  render() {
    const { t, children } = this.props
    if (!this.state.error) return children

    return (
      <div className="grid min-h-dvh place-items-center p-6">
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <div className="grid size-11 place-items-center rounded-full border bg-muted/50 text-destructive">
            <TriangleAlert className="size-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">{t('common.errorTitle')}</p>
            <p className="text-xs text-muted-foreground">{t('common.errorBody')}</p>
          </div>
          <pre className="max-w-full overflow-x-auto rounded-lg border bg-muted/40 p-2 text-start text-[11px] text-muted-foreground">
            {this.state.error.message}
          </pre>
          <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
            {t('common.reload')}
          </Button>
        </div>
      </div>
    )
  }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryBase)
