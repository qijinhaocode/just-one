import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-8 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-0 text-sm text-zinc-100 placeholder:text-zinc-500',
        'focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'transition-all duration-150 hover:border-zinc-600',
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export { Input }
