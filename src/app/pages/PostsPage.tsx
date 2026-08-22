import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { WorkspaceToggle } from '@/components/layout/WorkspaceToggle'
import { Button } from '@/components/ui/button'
import { FilterBar } from '@/features/calendar/FilterBar'
import { ListSkeleton } from '@/features/calendar/CalendarSkeleton'
import { ListView } from '@/features/calendar/ListView'
import { SearchBar } from '@/features/calendar/SearchBar'
import { PostDetailsDrawer } from '@/features/posts/PostDetailsDrawer'
import { PostEditor } from '@/features/posts/PostEditor'
import { usePermissions } from '@/hooks/usePermissions'
import { usePostById } from '@/hooks/usePosts'
import { useVisiblePosts } from '@/hooks/useVisiblePosts'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { closeEditor, closePost, openEditor, openPost } from '@/store/slices/viewSlice'

/** Flat, searchable list of everything on the plan — the management view. */
export function PostsPage() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const { canCreatePost } = usePermissions()
  const { posts, isLoading } = useVisiblePosts()
  const { activePostId, editor } = useAppSelector((s) => s.view)
  const activePost = usePostById(activePostId)
  const editingPost = usePostById(editor.postId)

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-5 lg:p-6">
      <PageHeader
        title={t('nav.posts')}
        subtitle={t('calendar.postsPlanned', { count: posts.length })}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* The list is workspace-scoped like the calendar, so the choice
                has to be reachable from here too. */}
            <WorkspaceToggle />
            {canCreatePost && (
              <Button size="sm" onClick={() => dispatch(openEditor())}>
                <Plus />
                {t('calendar.addToDay')}
              </Button>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchBar className="w-full sm:w-64" />
        <FilterBar />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border bg-card">
        {isLoading ? (
          <ListSkeleton />
        ) : (
          <ListView posts={posts} onPostClick={(id) => dispatch(openPost(id))} />
        )}
      </div>

      <PostDetailsDrawer
        post={activePost}
        open={Boolean(activePost)}
        onClose={() => dispatch(closePost())}
        onEdit={(id) => {
          dispatch(closePost())
          dispatch(openEditor({ postId: id }))
        }}
      />

      <PostEditor
        open={editor.open}
        post={editingPost}
        presetDate={editor.presetDate}
        presetTime={editor.presetTime}
        onClose={() => dispatch(closeEditor())}
      />
    </div>
  )
}
