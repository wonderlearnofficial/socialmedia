import type { ReactElement, ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Provider as ReduxProvider } from 'react-redux'
import { I18nextProvider } from 'react-i18next'
import { configureStore } from '@reduxjs/toolkit'
import i18n from '@/lib/i18n'
import filtersReducer from '@/store/slices/filtersSlice'
import settingsReducer from '@/store/slices/settingsSlice'
import viewReducer from '@/store/slices/viewSlice'
import type { Post } from '@/types'

export function makeStore() {
  return configureStore({
    reducer: { filters: filtersReducer, view: viewReducer, settings: settingsReducer },
  })
}

export function renderWithProviders(
  ui: ReactElement,
  options: RenderOptions & { store?: ReturnType<typeof makeStore> } = {},
) {
  const { store = makeStore(), ...rest } = options
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ReduxProvider store={store}>
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
        </QueryClientProvider>
      </ReduxProvider>
    )
  }

  return { store, queryClient, ...render(ui, { wrapper: Wrapper, ...rest }) }
}

let seq = 0
export function makePost(overrides: Partial<Post> = {}): Post {
  seq += 1
  return {
    id: `post_${seq}`,
    title: 'Back to School Campaign',
    description: 'A promotional post welcoming students back to school.',
    topic: 'Back to School',
    caption: 'Ready for a fresh start?',
    date: '2026-08-21',
    time: '10:00',
    platforms: ['instagram'],
    contentType: 'image',
    status: 'in_review',
    feedback: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}
