import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface FeedbackFormProps {
  onSubmit: (message: string) => Promise<void> | void
  onCancel?: () => void
  pending?: boolean
  /** "Request changes" prompt vs. a plain comment box. */
  variant?: 'changes' | 'comment'
  autoFocus?: boolean
}

export function FeedbackForm({
  onSubmit,
  onCancel,
  pending,
  variant = 'changes',
  autoFocus = true,
}: FeedbackFormProps) {
  const { t } = useTranslation()
  const [message, setMessage] = useState('')
  const disabled = pending || message.trim().length === 0

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (disabled) return
    await onSubmit(message.trim())
    setMessage('')
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      {variant === 'changes' && <p className="text-xs font-medium">{t('review.feedbackPrompt')}</p>}
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={
          variant === 'changes' ? t('review.feedbackPlaceholder') : t('review.commentPlaceholder')
        }
        autoFocus={autoFocus}
        rows={3}
        className="text-xs"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit(e)
        }}
      />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
            {t('post.cancel')}
          </Button>
        )}
        <Button type="submit" size="sm" disabled={disabled}>
          <Send className="size-3.5" />
          {pending
            ? t('review.sending')
            : variant === 'changes'
              ? t('review.send')
              : t('review.comment')}
        </Button>
      </div>
    </form>
  )
}
