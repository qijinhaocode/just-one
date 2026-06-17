import { useState } from 'react'
import { Target, Loader2, Sparkles, CheckCircle2, Circle, AlertTriangle, AlertOctagon, Clock } from 'lucide-react'
import { usePB } from '../hooks/usePB'
import { tasksApi, type Task } from '../services/pb'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { StreakBadge, DayScore } from './StreakAndScore'
import { CarryOverBanner } from './CarryOverBanner'
import { formatMinutes } from './InboxPanel'
import type { StreakData } from '../services/streak'

interface FocusBoardProps {
  notToDoRules: string[]
  onRunAI: () => void
  aiLoading: boolean
  aiError: string | null
  analysisSummary: string | null
  streak: StreakData | null
}

function TaskCard({ task, size = 'normal' }: { task: Task; size?: 'large' | 'normal' }) {
  const [completing, setCompleting] = useState(false)
  const [recordingTime, setRecordingTime] = useState(false)
  const [actualInput, setActualInput] = useState('')
  const isCompleted = task.status === 'completed'
  const isStale = (task.streakCount ?? 0) >= 3
  const isCritical = (task.streakCount ?? 0) >= 7

  async function toggleComplete() {
    if (completing) return
    setCompleting(true)
    const nowCompleted = !isCompleted
    await tasksApi.update(task.id, { status: nowCompleted ? 'completed' : 'pending' })
    // Prompt for actual time if completing and had an estimate
    if (nowCompleted && (task.estimatedMinutes ?? 0) > 0 && (task.actualMinutes ?? 0) === 0) {
      setRecordingTime(true)
    }
    setTimeout(() => setCompleting(false), 400)
  }

  async function saveActualTime() {
    const mins = parseInt(actualInput, 10)
    if (mins > 0) await tasksApi.update(task.id, { actualMinutes: mins })
    setRecordingTime(false)
    setActualInput('')
  }

  if (size === 'large') {
    return (
      <div className={`relative card p-6 transition-all duration-300
        ${isCritical ? 'border-red-500/50 bg-gradient-to-br from-red-950/30 to-zinc-950 shadow-must' :
          isStale ? 'border-amber-500/30 bg-gradient-to-br from-amber-950/20 to-zinc-950' :
          'border-red-500/30 bg-gradient-to-br from-zinc-900 to-zinc-950 shadow-must'}
        ${isCompleted ? 'opacity-70' : ''}`}
      >
        {!isCompleted && (
          <span className={`absolute top-3 right-3 w-2 h-2 rounded-full animate-pulse-slow ${isCritical ? 'bg-red-500' : 'bg-red-400'}`} />
        )}

        {isStale && !isCompleted && (
          <div className={`flex items-center gap-2 mb-4 px-3 py-2 rounded-lg text-xs font-mono
            ${isCritical ? 'bg-red-500/15 border border-red-500/30 text-red-400' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'}`}>
            {isCritical
              ? <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
              : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
            {isCritical
              ? `已拖延 ${task.streakCount} 天 — 再不做就彻底失控了`
              : `已拖延 ${task.streakCount} 天 — 今天必须解决`}
          </div>
        )}

        <div className="flex items-start gap-4">
          <button
            onClick={toggleComplete}
            className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 shrink-0 mt-0.5
              ${isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-red-500/60 hover:border-red-400 hover:bg-red-500/10'}`}
          >
            {(isCompleted || completing) && <CheckCircle2 className="w-4 h-4 text-white" />}
          </button>
          <div className="flex-1">
            <Badge variant="must" className="mb-3">MUST · 1 件大事</Badge>
            <p className={`text-xl font-bold leading-snug ${isCompleted ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>
              {task.title}
            </p>
            {task.description && <p className="text-sm text-zinc-500 mt-2 leading-relaxed">{task.description}</p>}
            {/* Estimated time */}
            {(task.estimatedMinutes ?? 0) > 0 && (
              <div className="mt-2 flex items-center gap-1.5 text-xs font-mono text-zinc-500">
                <Clock className="w-3 h-3" />
                预估 {formatMinutes(task.estimatedMinutes)}
                {(task.actualMinutes ?? 0) > 0 && (
                  <span className="text-zinc-600">· 实际 {formatMinutes(task.actualMinutes)}</span>
                )}
              </div>
            )}
            {task.why && !isCompleted && (
              <div className="mt-3 flex items-start gap-2 px-3 py-2 bg-zinc-800/60 border border-zinc-700/60 rounded-lg">
                <span className="text-zinc-500 text-xs mt-0.5 shrink-0">因为</span>
                <p className="text-xs text-zinc-300 leading-relaxed italic">{task.why}</p>
              </div>
            )}
          </div>
        </div>
        {isCompleted && !recordingTime && (
          <div className="mt-4 flex items-center gap-2 text-sm text-emerald-400 font-medium">
            <CheckCircle2 className="w-4 h-4" /> 主线大事已完成！继续保持节奏。
          </div>
        )}
        {/* Prompt for actual time after completing */}
        {recordingTime && (
          <div className="mt-4 flex items-center gap-3 p-3 bg-zinc-800/60 border border-zinc-700 rounded-lg animate-slide-up">
            <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
            <p className="text-xs text-zinc-300">实际用了多少分钟？</p>
            <input
              type="number" min={1} max={480} placeholder="分钟"
              value={actualInput} onChange={e => setActualInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveActualTime() }}
              className="h-7 w-20 rounded border border-zinc-600 bg-zinc-800 px-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-400"
              autoFocus
            />
            <button onClick={saveActualTime} className="text-xs text-emerald-400 hover:text-emerald-300 font-mono">记录</button>
            <button onClick={() => setRecordingTime(false)} className="text-xs text-zinc-600 hover:text-zinc-400">跳过</button>
          </div>
        )}
      </div>
    )
  }

  const borderByType: Record<Task['priorityType'], string> = {
    must: 'border-red-500/20', should: 'border-amber-500/20',
    could: 'border-emerald-500/20', inbox: 'border-zinc-700',
  }

  return (
    <div className={`card p-4 flex items-start gap-3 transition-all duration-150
      ${isStale && !isCompleted ? 'border-amber-500/25 bg-amber-950/10' : `hover:border-zinc-700 ${borderByType[task.priorityType]}`}
      ${isCompleted ? 'opacity-60' : ''}`}
    >
      <button onClick={toggleComplete}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 mt-0.5
          ${isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600 hover:border-zinc-400'}`}>
        {isCompleted && <CheckCircle2 className="w-3 h-3 text-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-sm font-medium ${isCompleted ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>{task.title}</p>
          {isCritical && !isCompleted && <Badge variant="danger" className="gap-1"><AlertOctagon className="w-3 h-3" />{task.streakCount}天</Badge>}
          {isStale && !isCritical && !isCompleted && <Badge variant="warning" className="gap-1"><AlertTriangle className="w-3 h-3" />{task.streakCount}天</Badge>}
        </div>
        {task.description && <p className="text-xs text-zinc-600 mt-0.5 truncate">{task.description}</p>}
        {task.why && !isCompleted && <p className="text-xs text-zinc-500 mt-1 italic">因为：{task.why}</p>}
        {(task.estimatedMinutes ?? 0) > 0 && (
          <div className="flex items-center gap-1.5 mt-1 text-xs font-mono text-zinc-600">
            <Clock className="w-3 h-3" />
            {formatMinutes(task.estimatedMinutes)}
            {(task.actualMinutes ?? 0) > 0 && (
              <span>· 实际 {formatMinutes(task.actualMinutes)}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function FocusBoard({ notToDoRules, onRunAI, aiLoading, aiError, analysisSummary, streak }: FocusBoardProps) {
  const today = new Date().toISOString().split('T')[0]

  const { data: mustTasks } = usePB<Task[]>(
    () => tasksApi.list(`priorityType = "must" && status != "dropped" && (targetDate = "${today}" || targetDate = "")`), [today], 'tasks')
  const { data: shouldTasks } = usePB<Task[]>(
    () => tasksApi.list(`priorityType = "should" && status != "dropped" && (targetDate = "${today}" || targetDate = "")`), [today], 'tasks')
  const { data: couldTasks } = usePB<Task[]>(
    () => tasksApi.list(`priorityType = "could" && status != "dropped" && (targetDate = "${today}" || targetDate = "")`), [today], 'tasks')
  const { data: inboxCount } = usePB<number>(
    () => tasksApi.list('priorityType = "inbox" && status != "dropped"').then(r => r.length), [], 'tasks')

  const hasAnyFocusTasks = (mustTasks?.length ?? 0) + (shouldTasks?.length ?? 0) + (couldTasks?.length ?? 0) > 0

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex gap-3">
        <StreakBadge streak={streak} />
        <div className="flex-1"><DayScore todayDone={streak?.todayDone ?? false} /></div>
      </div>

      <CarryOverBanner onCarried={() => {}} />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">今日聚焦看板</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
        </div>
        <Button onClick={onRunAI} disabled={aiLoading || (inboxCount ?? 0) === 0}>
          {aiLoading
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> AI 思考中...</>
            : <><Sparkles className="w-3.5 h-3.5" /> AI 对齐分析{(inboxCount ?? 0) > 0 && <Badge variant="muted" className="ml-1">{inboxCount}</Badge>}</>}
        </Button>
      </div>

      {aiError && (
        <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-400">{aiError}</p>
        </div>
      )}

      {analysisSummary && (
        <div className="card p-4 bg-zinc-800/40 border-zinc-700/60">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs font-mono text-zinc-500">AI 对齐分析</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">{analysisSummary}</p>
        </div>
      )}

      {!hasAnyFocusTasks && (
        <div className="card p-10 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center">
            <Target className="w-7 h-7 text-zinc-500" />
          </div>
          <div>
            <p className="text-base font-semibold text-zinc-300">今日聚焦清单为空</p>
            <p className="text-sm text-zinc-600 mt-1.5 max-w-xs">先在收集箱添加任务，再点击 AI 对齐分析。</p>
          </div>
          {(inboxCount ?? 0) > 0 && (
            <Button onClick={onRunAI} disabled={aiLoading}>
              <Sparkles className="w-3.5 h-3.5" /> 立即分析 {inboxCount} 条任务
            </Button>
          )}
        </div>
      )}

      {mustTasks && mustTasks.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-xs font-mono font-semibold text-red-400 uppercase tracking-wider">JustOne 核心大事</span>
          </div>
          <TaskCard task={mustTasks[0]} size="large" />
        </section>
      )}

      {shouldTasks && shouldTasks.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs font-mono font-semibold text-amber-400 uppercase tracking-wider">
              应该做 · {shouldTasks.length} 件
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {shouldTasks.slice(0, 3).map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        </section>
      )}

      {couldTasks && couldTasks.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
              顺便做 · {couldTasks.length} 件
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {couldTasks.slice(0, 5).map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        </section>
      )}

      {notToDoRules.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-zinc-600" />
            <span className="text-xs font-mono font-semibold text-zinc-500 uppercase tracking-wider">今日拒绝清单</span>
          </div>
          <div className="card p-4 space-y-2">
            {notToDoRules.map((rule, i) => (
              <div key={i} className="flex items-start gap-3">
                <Circle className="w-3 h-3 text-zinc-600 shrink-0 mt-0.5" />
                <p className="text-xs text-zinc-500">{rule}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
