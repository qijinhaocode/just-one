import * as React from 'react'
import { cn } from '@/lib/utils'

const Badge = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & {
    variant?: 'must' | 'should' | 'could' | 'inbox' | 'success' | 'warning' | 'danger' | 'muted'
  }
>(({ className, variant = 'muted', ...props }, ref) => {
  const variants = {
    must:    'bg-red-500/15 text-red-400 border-red-500/25',
    should:  'bg-amber-500/15 text-amber-400 border-amber-500/25',
    could:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    inbox:   'bg-zinc-700/50 text-zinc-400 border-zinc-600/50',
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    danger:  'bg-red-500/15 text-red-400 border-red-500/25',
    muted:   'bg-zinc-800 text-zinc-500 border-zinc-700',
  }
  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-mono font-medium',
        variants[variant],
        className
      )}
      {...props}
    />
  )
})
Badge.displayName = 'Badge'

export { Badge }
