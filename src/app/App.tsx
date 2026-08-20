import { QueryClientProvider } from '@tanstack/react-query'
import { Provider as ReduxProvider } from 'react-redux'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { queryClient } from '@/services/queryClient'
import { store } from '@/store'
import { ErrorBoundary } from './ErrorBoundary'
import { ThemeSync } from './ThemeSync'
import { router } from './router'

export function App() {
  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>
          <ThemeSync />
          <ErrorBoundary>
            <RouterProvider router={router} />
          </ErrorBoundary>
          <Toaster
            position="bottom-right"
            toastOptions={{
              classNames: {
                toast:
                  'group rounded-lg border border-border bg-card text-card-foreground shadow-lg text-sm',
                description: 'text-muted-foreground',
              },
            }}
          />
        </TooltipProvider>
      </QueryClientProvider>
    </ReduxProvider>
  )
}
