import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, Folder, FolderPlus, Loader2, X } from 'lucide-react'
import { usePostsQuery } from '@/hooks/usePosts'
import { WORKSPACE_META } from '@/lib/constants'
import { listReviewSocialMediaFolders } from '@/services/upload'
import { cn } from '@/lib/utils'
import type { WorkspaceId } from '@/types'

interface ProjectFolderPickerProps {
  value?: string
  onChange: (val: string) => void
  workspace: WorkspaceId
  disabled?: boolean
  className?: string
}

export function ProjectFolderPicker({
  value = '',
  onChange,
  workspace,
  disabled,
  className,
}: ProjectFolderPickerProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const category = WORKSPACE_META[workspace]?.driveCategory || 'Social Media'

  // Query live folders directly from Google Drive under Review / [category]
  const { data: driveReviewFolders = [], isLoading } = useQuery({
    queryKey: ['drive-review-folders', category],
    queryFn: () => listReviewSocialMediaFolders(category),
    staleTime: 15_000,
  })

  const { data: posts = [] } = usePostsQuery(workspace)

  // Strictly only show existing folders in Review > Social Media (no hardcoded defaults)
  const allFolderNames = useMemo(() => {
    const set = new Set<string>()

    // 1. Existing folders in Google Drive under Review / Social Media
    for (const f of driveReviewFolders) {
      if (f.name?.trim()) set.add(f.name.trim())
    }

    // 2. Active posts currently in Review or Changes Required stage
    for (const p of posts) {
      if (
        p.topic?.trim() &&
        (p.driveStage === 'review' || p.status === 'review' || p.status === 'changes_required')
      ) {
        set.add(p.topic.trim())
      }
    }

    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [driveReviewFolders, posts])

  // Sync internal search when value prop changes
  useEffect(() => {
    setSearch(value)
  }, [value])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return allFolderNames
    return allFolderNames.filter((name) => name.toLowerCase().includes(query))
  }, [allFolderNames, search])

  const exactMatch = useMemo(() => {
    const query = search.trim().toLowerCase()
    return allFolderNames.some((name) => name.toLowerCase() === query)
  }, [allFolderNames, search])

  const handleSelect = (name: string) => {
    onChange(name)
    setSearch(name)
    setOpen(false)
  }

  const handleCreate = () => {
    const clean = search.trim()
    if (!clean) return
    onChange(clean)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div
        className={cn(
          'flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm shadow-xs transition-colors',
          'focus-within:border-ring focus-within:ring-1 focus-within:ring-ring',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <Folder className="size-4 shrink-0 text-primary" />
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={search}
          placeholder={t('editor.projectFolderPlaceholder', 'e.g. Project1, Campaign A...')}
          onChange={(e) => {
            setSearch(e.target.value)
            onChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (!exactMatch && search.trim()) {
                handleCreate()
              } else if (filtered.length > 0) {
                handleSelect(filtered[0])
              }
            } else if (e.key === 'Escape') {
              setOpen(false)
            }
          }}
          className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />

        {search ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              setSearch('')
              onChange('')
              inputRef.current?.focus()
            }}
            className="flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        ) : null}

        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen((prev) => !prev)}
          className="flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
        >
          {isLoading ? (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          ) : (
            <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
          )}
        </button>
      </div>

      {/* Floating Dropdown */}
      {open && !disabled && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-xl backdrop-blur-md">
          {/* Header indicator */}
          <div className="flex items-center justify-between border-b border-border/50 px-2.5 py-1.5 mb-1 text-[11px] font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Folder className="size-3 text-primary" />
              <span>Drive: Review / {category}</span>
            </span>
            <span className="text-[10px] opacity-75">
              {allFolderNames.length > 0
                ? `${allFolderNames.length} folder${allFolderNames.length > 1 ? 's' : ''}`
                : 'Empty'}
            </span>
          </div>

          {/* Option to create a new folder when typing a non-existing name */}
          {search.trim() && !exactMatch && (
            <button
              type="button"
              onClick={handleCreate}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <FolderPlus className="size-4 shrink-0 text-primary" />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="truncate">
                  {t('editor.createFolderNamed', 'Create "{{name}}"', { name: search.trim() })}
                </span>
                <span className="text-[10px] text-muted-foreground">in Review / {category}</span>
              </div>
              <span className="shrink-0 rounded-md bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {t('common.new', 'New')}
              </span>
            </button>
          )}

          {/* List of existing Review folders if any exist */}
          {filtered.length > 0 ? (
            <div className="space-y-0.5 pt-0.5">
              {filtered.map((name) => {
                const isSelected = value.trim().toLowerCase() === name.toLowerCase()
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleSelect(name)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-xs font-medium transition-colors',
                      isSelected
                        ? 'bg-accent text-accent-foreground font-semibold'
                        : 'text-foreground hover:bg-muted/70',
                    )}
                  >
                    <Folder
                      className={cn(
                        'size-3.5 shrink-0',
                        isSelected ? 'text-primary' : 'text-muted-foreground',
                      )}
                    />
                    <span className="flex-1 truncate">{name}</span>
                    {isSelected && <Check className="size-3.5 shrink-0 text-primary" />}
                  </button>
                )
              })}
            </div>
          ) : allFolderNames.length === 0 && !search.trim() ? (
            /* Empty state when no folders exist in Review / category yet */
            <div className="py-3 px-2 text-center text-xs">
              <FolderPlus className="mx-auto size-5 text-primary/70 mb-1" />
              <p className="font-medium text-foreground">
                {t('editor.noFoldersTitle', 'No folders exist yet')}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {t(
                  'editor.noFoldersPrompt',
                  'Type a folder name above to create one in Review / {{category}}',
                  { category },
                )}
              </p>
            </div>
          ) : search.trim() && !exactMatch ? null : (
            <div className="p-2.5 text-center text-xs text-muted-foreground">
              {t('editor.noFoldersFound', 'No matching folders found')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
