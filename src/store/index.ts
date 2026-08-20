import { configureStore } from '@reduxjs/toolkit'
import filtersReducer from './slices/filtersSlice'
import settingsReducer, { SETTINGS_KEY } from './slices/settingsSlice'
import viewReducer from './slices/viewSlice'

export const store = configureStore({
  reducer: {
    filters: filtersReducer,
    view: viewReducer,
    settings: settingsReducer,
  },
})

let lastSettings = store.getState().settings
store.subscribe(() => {
  const settings = store.getState().settings
  if (settings !== lastSettings) {
    lastSettings = settings
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      // storage unavailable — settings just won't persist
    }
  }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
