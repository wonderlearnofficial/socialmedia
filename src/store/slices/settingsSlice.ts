import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { WORKSPACES, type WorkspaceId } from '@/types'

export type ThemeSetting = 'dark' | 'light' | 'system'
export type LanguageSetting = 'en' | 'ar'

export interface SettingsState {
  theme: ThemeSetting
  language: LanguageSetting
  activeWorkspace: WorkspaceId
  trackingAs?: string | null
}

export const SETTINGS_KEY = 'cadence-settings'

function loadSettings(): SettingsState {
  const defaults: SettingsState = {
    theme: 'dark',
    language: 'en',
    activeWorkspace: 'wonderlearn',
    trackingAs: null,
  }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<SettingsState>
    return {
      theme: parsed.theme === 'light' || parsed.theme === 'system' ? parsed.theme : 'dark',
      language: parsed.language === 'ar' ? 'ar' : 'en',
      activeWorkspace: WORKSPACES.includes(parsed.activeWorkspace as WorkspaceId)
        ? (parsed.activeWorkspace as WorkspaceId)
        : 'wonderlearn',
      trackingAs: parsed.trackingAs ?? null,
    }
  } catch {
    return defaults
  }
}

const settingsSlice = createSlice({
  name: 'settings',
  initialState: loadSettings,
  reducers: {
    setTheme(state, action: PayloadAction<ThemeSetting>) {
      state.theme = action.payload
    },
    setLanguage(state, action: PayloadAction<LanguageSetting>) {
      state.language = action.payload
    },
    setActiveWorkspace(state, action: PayloadAction<WorkspaceId>) {
      state.activeWorkspace = action.payload
    },
    setTrackingAs(state, action: PayloadAction<string | null>) {
      state.trackingAs = action.payload
    },
  },
})

export const { setTheme, setLanguage, setActiveWorkspace, setTrackingAs } = settingsSlice.actions
export default settingsSlice.reducer
