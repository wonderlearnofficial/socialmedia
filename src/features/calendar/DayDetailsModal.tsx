import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarPlus, Plus } from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { usePrefersReducedMotion } from '@/hooks/useReducedMotion'
import { formatDateFull } from '@/lib/dates'
import { postsForDay } from '@/lib/filtering'
import type { Post } from '@/types'
import { PostRow } from './PostRow'

interface DayDetailsModalProps {
  dateKey: string | null
  posts: Post[]
  onClose: () => void
  onPostClick: (id: string) => void
  onAddPost?: (dateKey: string) => void
}

/**
 * The day popup — the pivot of the whole product. Click a day, see everything
 * planned for it, click through to a post.
 */
export function DayDetailsModal({
  dateKey,
  posts,
  onClose,
  onPostClick,
  onAddPost,
}: DayDetailsModalProps) {
  const { t, i18n } = useTranslation()
  const reduceMotion = usePrefersReducedMotion()
  const dayPosts = dateKey ? postsForDay(posts, dateKey) : []

  return (
    <AnimatePresence>
      {dateKey && (
        <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]"
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              />
            </DialogPrimitive.Overlay>

            <DialogPrimitive.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[calc(100%-2rem)] max-w-lg flex-col overflow-hidden rounded-2xl border bg-card shadow-lg focus:outline-none"
                style={{ x: '-50%', y: '-50%' }}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: '-48%' }}
                animate={{ opacity: 1, scale: 1, y: '-50%' }}
                exit={{ opacity: 0, scale: 0.97, y: '-49%' }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <header className="flex items-start justify-between gap-4 border-b p-5 pe-14">
                  <div className="min-w-0">
                    <DialogPrimitive.Title className="text-base font-semibold tracking-tight">
                      {formatDateFull(dateKey, i18n.language)}
                    </DialogPrimitive.Title>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t('calendar.postsPlanned', { count: dayPosts.length })}
                    </p>
                  </div>
                  {onAddPost && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => onAddPost(dateKey)}
                    >
                      <Plus className="size-3.5" />
                      {t('calendar.addToDay')}
                    </Button>
                  )}
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  {dayPosts.length === 0 ? (
                    <EmptyState
                      icon={CalendarPlus}
                      title={t('calendar.noPostsDay')}
                      className="py-8"
                    />
                  ) : (
                    <motion.div
                      className="space-y-2"
                      initial="hidden"
                      animate="show"
                      variants={{
                        hidden: {},
                        show: { transition: { staggerChildren: reduceMotion ? 0 : 0.045 } },
                      }}
                    >
                      {dayPosts.map((post) => (
                        <motion.div
                          key={post.id}
                          variants={{
                            hidden: reduceMotion ? {} : { opacity: 0, y: 8 },
                            show: { opacity: 1, y: 0 },
                          }}
                        >
                          <PostRow post={post} onClick={() => onPostClick(post.id)} />
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </div>

                <DialogPrimitive.Close className="absolute end-4 top-4 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60">
                  <svg
                    viewBox="0 0 24 24"
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                  <span className="sr-only">{t('common.close')}</span>
                </DialogPrimitive.Close>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      )}
    </AnimatePresence>
  )
}
