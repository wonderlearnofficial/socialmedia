import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WORKSPACE_META } from '@/lib/constants'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setActiveWorkspace } from '@/store/slices/settingsSlice'
import { WORKSPACES, type WorkspaceId } from '@/types'

/**
 * Re-scopes the whole app — calendar, posts, analytics, team — to whichever
 * client's data is active. Deliberately separate from the app's own brand
 * mark: this picks which client you're looking at, not who built the tool.
 */
export function WorkspaceSwitcher({ className }: { className?: string }) {
  const dispatch = useAppDispatch()
  const active = useAppSelector((s) => s.settings.activeWorkspace)

  return (
    <Tabs
      value={active}
      onValueChange={(value) => dispatch(setActiveWorkspace(value as WorkspaceId))}
      className={className}
    >
      <TabsList className="w-full">
        {WORKSPACES.map((workspace) => (
          <TabsTrigger key={workspace} value={workspace} className="flex-1">
            {WORKSPACE_META[workspace].label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
