import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type CalendarViewMode = 'month' | 'week' | 'list'

export interface EditorState {
  open: boolean
  /** editing an existing post when set */
  postId: string | null
  presetDate: string | null
  presetTime: string | null
}

interface ViewState {
  view: CalendarViewMode
  /** ISO anchor for the visible period */
  dateISO: string
  /** yyyy-MM-dd of the day whose details modal is open */
  selectedDay: string | null
  /** post whose details drawer is open */
  activePostId: string | null
  editor: EditorState
  shareOpen: boolean
}

const initialState: ViewState = {
  view: 'month',
  dateISO: new Date().toISOString(),
  selectedDay: null,
  activePostId: null,
  editor: { open: false, postId: null, presetDate: null, presetTime: null },
  shareOpen: false,
}

const viewSlice = createSlice({
  name: 'view',
  initialState,
  reducers: {
    setView(state, action: PayloadAction<CalendarViewMode>) {
      state.view = action.payload
    },
    setDateISO(state, action: PayloadAction<string>) {
      state.dateISO = action.payload
    },
    openDay(state, action: PayloadAction<string>) {
      state.selectedDay = action.payload
    },
    closeDay(state) {
      state.selectedDay = null
    },
    openPost(state, action: PayloadAction<string>) {
      state.activePostId = action.payload
    },
    closePost(state) {
      state.activePostId = null
    },
    openEditor(state, action: PayloadAction<Partial<Omit<EditorState, 'open'>> | undefined>) {
      state.editor = {
        open: true,
        postId: action.payload?.postId ?? null,
        presetDate: action.payload?.presetDate ?? null,
        presetTime: action.payload?.presetTime ?? null,
      }
    },
    closeEditor(state) {
      state.editor = { open: false, postId: null, presetDate: null, presetTime: null }
    },
    setShareOpen(state, action: PayloadAction<boolean>) {
      state.shareOpen = action.payload
    },
  },
})

export const {
  setView,
  setDateISO,
  openDay,
  closeDay,
  openPost,
  closePost,
  openEditor,
  closeEditor,
  setShareOpen,
} = viewSlice.actions
export default viewSlice.reducer
