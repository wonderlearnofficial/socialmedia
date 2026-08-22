import { BrandMark } from '@/components/shared/Brand'
import { PlatformIcon } from '@/components/shared/PlatformIcon'
import { cn } from '@/lib/utils'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setActiveWorkspace } from '@/store/slices/settingsSlice'

/**
 * Re-scopes the whole app — calendar, posts, analytics, team — to whichever
 * client's data is active.
 */
export function WorkspaceToggle({ className }: { className?: string }) {
  const dispatch = useAppDispatch()
  const workspace = useAppSelector((s) => s.settings.activeWorkspace)

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#12161D] p-1 shadow-sm backdrop-blur-md',
        className,
      )}
      role="group"
      aria-label="Workspace"
    >
      <button
        type="button"
        onClick={() => dispatch(setActiveWorkspace('wonderlearn'))}
        aria-pressed={workspace === 'wonderlearn'}
        className={cn(
          'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 cursor-pointer',
          workspace === 'wonderlearn'
            ? 'bg-white text-neutral-950 shadow-md shadow-white/10 ring-1 ring-white/90 font-bold'
            : 'text-muted-foreground hover:bg-white/[0.06] hover:text-foreground',
        )}
      >
        <BrandMark className="size-4 shrink-0" />
        <span className={workspace === 'wonderlearn' ? 'text-neutral-950 font-bold' : ''}>
          WonderLearn
        </span>
        {workspace === 'wonderlearn' && (
          <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
        )}
      </button>
      <button
        type="button"
        onClick={() => dispatch(setActiveWorkspace('dr_wael'))}
        aria-pressed={workspace === 'dr_wael'}
        className={cn(
          'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 cursor-pointer',
          workspace === 'dr_wael'
            ? 'bg-gradient-to-r from-[#0A66C2] to-blue-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-400/50 font-bold'
            : 'text-muted-foreground hover:bg-white/[0.06] hover:text-foreground',
        )}
      >
        <PlatformIcon
          platform="linkedin"
          className={cn(
            'size-4 shrink-0',
            workspace === 'dr_wael' ? 'text-white' : 'text-[#0A66C2]',
          )}
        />
        <span>Dr. Wael</span>
        {workspace === 'dr_wael' && (
          <span className="size-1.5 rounded-full bg-white animate-pulse" />
        )}
      </button>
    </div>
  )
}
