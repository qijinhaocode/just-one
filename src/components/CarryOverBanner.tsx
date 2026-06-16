import { useState, useEffect } from 'react'
import { ClipboardList, Loader2 } from 'lucide-react'
import { tasksApi } from '../services/pb'
import { Button } from './ui/button'

interface CarryOverBannerProps {
  onCarried: () => void
}

export function CarryOverBanner({ onCarried }: CarryOverBannerProps) {
  const [count, setCount] = useState<number | null>(null)
  const [carrying, setCarrying] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const yesterday = (() => {
      const d = new Date(); d.setDate(d.getDate() - 1)
      return d.toISOString().split('T')[0]
    })()
    tasksApi.list(`status = "pending" && priorityType != "inbox" && targetDate = "${yesterday}"`).then(items => setCount(items.length))
  }, [])

  if (dismissed || count === null || count === 0) return null

  async function handleCarry() {
    setCarrying(true)
    await tasksApi.carryOverYesterday()
    setCarrying(false); setDismissed(true); onCarried()
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-zinc-800/60 border border-zinc-700/60 rounded-xl animate-slide-up">
      <ClipboardList className="w-5 h-5 text-zinc-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-200">昨天有 {count} 个任务未完成</p>
        <p className="text-xs text-zinc-500 mt-0.5">是否延续到今天？</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => setDismissed(true)}>忽略</Button>
        <Button size="sm" onClick={handleCarry} disabled={carrying}>
          {carrying
            ? <><Loader2 className="w-3 h-3 animate-spin" /> 延续中...</>
            : '一键延续 →'}
        </Button>
      </div>
    </div>
  )
}
