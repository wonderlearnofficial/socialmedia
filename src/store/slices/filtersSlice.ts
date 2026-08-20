import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { PostFilters } from '@/lib/filtering'
import type { PostStatus, SocialPlatform } from '@/types'

const initialState: PostFilters = {
  platforms: [],
  statuses: [],
  search: '',
}

const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    togglePlatform(state, action: PayloadAction<SocialPlatform>) {
      const p = action.payload
      state.platforms = state.platforms.includes(p)
        ? state.platforms.filter((x) => x !== p)
        : [...state.platforms, p]
    },
    setPlatforms(state, action: PayloadAction<SocialPlatform[]>) {
      state.platforms = action.payload
    },
    toggleStatus(state, action: PayloadAction<PostStatus>) {
      const s = action.payload
      state.statuses = state.statuses.includes(s)
        ? state.statuses.filter((x) => x !== s)
        : [...state.statuses, s]
    },
    setStatuses(state, action: PayloadAction<PostStatus[]>) {
      state.statuses = action.payload
    },
    setSearch(state, action: PayloadAction<string>) {
      state.search = action.payload
    },
    clearFilters(state) {
      state.platforms = []
      state.statuses = []
      state.search = ''
    },
  },
})

export const { togglePlatform, setPlatforms, toggleStatus, setStatuses, setSearch, clearFilters } =
  filtersSlice.actions
export default filtersSlice.reducer
