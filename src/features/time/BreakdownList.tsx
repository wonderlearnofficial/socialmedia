import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { formatHoursMinutes } from '@/lib/time'
import { cn } from '@/lib/utils'

export interface BreakdownNode {
  key: string
  label: string
  hint?: string
  seconds: number
  children?: BreakdownNode[]
}

/**
 * The drill-down used by every report: company → project → work item →
 * contributor, or any prefix of it. Share bars are scaled against the largest
 * sibling at each level, so a nested list stays readable instead of collapsing
 * into slivers next to the top-level total.
 */
export function BreakdownList({
  nodes,
  emptyLabel,
  depth = 0,
}: {
  nodes: BreakdownNode[]
  emptyLabel?: string
  depth?: number
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  if (nodes.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-sm text-muted-foreground">
        {emptyLabel ?? t('time.noData')}
      </p>
    )
  }

  const max = Math.max(...nodes.map((n) => n.seconds), 1)

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <ul className={cn('space-y-1', depth > 0 && 'mt-1 border-s ps-3')}>
      {nodes.map((node) => {
        const hasChildren = Boolean(node.children?.length)
        const isOpen = expanded.has(node.key)
        return (
          <li key={node.key}>
            <div
              className={cn(
                'group flex items-center gap-2 rounded-md px-2 py-1.5',
                hasChildren && 'cursor-pointer hover:bg-accent/50',
              )}
              onClick={hasChildren ? () => toggle(node.key) : undefined}
              role={hasChildren ? 'button' : undefined}
              tabIndex={hasChildren ? 0 : undefined}
              onKeyDown={
                hasChildren
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        toggle(node.key)
                      }
                    }
                  : undefined
              }
            >
              <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
                {hasChildren &&
                  (isOpen ? (
                    <ChevronDown className="size-3.5" />
                  ) : (
                    <ChevronRight className="size-3.5 rtl:rotate-180" />
                  ))}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{node.label}</span>
                {node.hint && (
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {node.hint}
                  </span>
                )}
              </span>

              <span className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-muted sm:block">
                <span
                  className="block h-full rounded-full bg-primary/70"
                  style={{ width: `${Math.max(2, (node.seconds / max) * 100)}%` }}
                />
              </span>

              <span className="w-20 shrink-0 text-end font-mono text-xs tabular-nums">
                {formatHoursMinutes(node.seconds)}
              </span>
            </div>

            {hasChildren && isOpen && (
              <BreakdownList nodes={node.children ?? []} depth={depth + 1} />
            )}
          </li>
        )
      })}
    </ul>
  )
}
