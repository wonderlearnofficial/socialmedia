import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { WORKSPACE_DEFAULT } from '@/lib/constants'

export type ThemeSetting = 'dark' | 'light' | 'system'
export type LanguageSetting = 'en' | 'ar'

export interface SettingsState {
  theme: ThemeSetting
  language: LanguageSetting
  workspaceName: string
}

export const SETTINGS_KEY = 'cadence-settings'

function loadSettings(): SettingsState {
  const defaults: SettingsState = {
    theme: 'dark',
    language: 'en',
    workspaceName: WORKSPACE_DEFAULT,
  }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<SettingsState>
    return {
      theme: parsed.theme === 'light' || parsed.theme === 'system' ? parsed.theme : 'dark',
      language: parsed.language === 'ar' ? 'ar' : 'en',
      workspaceName:
        typeof parsed.workspaceName === 'string' && parsed.workspaceName.trim()
          ? parsed.workspaceName
          : WORKSPACE_DEFAULT,
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
    setWorkspaceName(state, action: PayloadAction<string>) {
      state.workspaceName = action.payload
    },
  },
})

export const { setTheme, setLanguage, setWorkspaceName } = settingsSlice.actions
export default settingsSlice.reducer
