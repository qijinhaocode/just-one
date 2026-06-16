import { useState } from 'react'
import { CheckCircle2, XCircle, Sparkles, Loader2 } from 'lucide-react'
import { usePB } from '../hooks/usePB'
import { tasksApi, reviewsApi, type Task, type DailyReview, type DailyReviewPayload } from '../services/pb'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Slider } from './ui/slider'

interface EveningReviewProps {
  onGenerateInsight: (review: DailyReviewPayload) => Promise<string>
}

export function EveningReview({ onGenerateInsight }: EveningReviewProps) {
  const today = new Date().toISOString().split('T')[0]

  const { data: todayReview, refetch: refetchReview } = usePB<DailyReview | null>(
    () => reviewsApi.getByDate(today), [today], 'daily_reviews'
  )
  const { data: mustTask } = usePB<Task | null>(
    () => tasksApi.list(`priorityType = "must" && status != "dropped" && (targetDate = "${today}" || targetDate = "")`).then(r => r[0] ?? null),
    [today], 'tasks'
  )

  const [focusScore, setFocusScore] = useState(7)
  const [q1, setQ1] = useState('')
  const [q2, setQ2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mustCompleted = mustTask?.status === 'completed'

  async function handleSubmit() {
    if (!q1.trim() || !q2.trim()) return
    setLoading(true); setError(null)
    try {
      const reviewData: DailyReviewPayload = {
        date: today, mustCompleted, reflectionQ1: q1.trim(),
        reflectionQ2: q2.trim(), focusScore, aiInsight: '',
      }
      const aiInsight = await onGenerateInsight(reviewData)
      await reviewsApi.upsert({ ...reviewData, aiInsight })
      setQ1(''); setQ2(''); refetchReview()
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败，请重试')
    } finally { setLoading(false) }
  }

  const scoreLabelMap: Record<number, string> = {
    1: '完全走神', 2: '很分散', 3: '较分散', 4: '一般偏差',
    5: '一般', 6: '还不错', 7: '较专注', 8: '专注', 9: '很专注', 10: '心流状态',
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-zinc-100">今日复盘</h2>
        <p className="text-sm text-zinc-500 mt-0.5">诚实地审视自己的执行状态。</p>
      </div>

      {/* Must status */}
      <div className={`card p-4 flex items-center gap-4 ${mustCompleted ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
        {mustCompleted
          ? <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
          : <XCircle className="w-8 h-8 text-red-400 shrink-0" />}
        <div>
          <p className="text-sm font-semibold text-zinc-200">今日核心大事</p>
          <p className={`text-xs mt-0.5 font-medium ${mustCompleted ? 'text-emerald-400' : 'text-red-400'}`}>
            {mustCompleted ? '已完成 — 主线全胜！' : mustTask ? `「${mustTask.title}」未完成` : '今日未设定 Must-Do'}
          </p>
        </div>
      </div>

      {/* Focus score */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-zinc-300">今日专注度</label>
          <div className="text-right">
            <span className="text-2xl font-black font-mono text-zinc-100">{focusScore}</span>
            <span className="text-sm text-zinc-500 ml-1">/10</span>
            <p className="text-xs text-zinc-500 mt-0.5">{scoreLabelMap[focusScore]}</p>
          </div>
        </div>
        <Slider
          min={1} max={10} step={1}
          value={[focusScore]}
          onValueChange={([v]) => setFocusScore(v)}
        />
        <div className="flex justify-between text-xs text-zinc-600 font-mono">
          <span>1</span><span>5</span><span>10</span>
        </div>
      </div>

      {/* Reflection */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-300">今天完成了什么？</label>
        <Textarea rows={3} placeholder="无论大小，都值得被记录下来…" value={q1} onChange={e => setQ1(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-300">遇到了什么阻碍？</label>
        <Textarea rows={3} placeholder="外部干扰？内部阻力？时间分配问题？" value={q2} onChange={e => setQ2(e.target.value)} />
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">{error}</div>
      )}

      <Button
        className="w-full py-2.5"
        onClick={handleSubmit}
        disabled={loading || !q1.trim() || !q2.trim()}
      >
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> AI Coach 诊断中...</>
          : <><Sparkles className="w-4 h-4" /> 生成 AI 深度洞察</>}
      </Button>

      {todayReview?.aiInsight && (
        <div className="card p-5 bg-zinc-800/40 border-zinc-700/60 space-y-3 animate-slide-up">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs font-mono text-zinc-500">AI Coach 每日诊断 · {today}</span>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{todayReview.aiInsight}</p>
        </div>
      )}
    </div>
  )
}
