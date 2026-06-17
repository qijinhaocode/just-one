import { useState } from 'react'
import {
  Plus, Inbox, Brain, LayoutTemplate, Check, X, Trash2,
  AlertTriangle, AlertOctagon, Clock
} from 'lucide-react'
import { usePB } from '../hooks/usePB'
import { tasksApi, milestonesApi, type Task, type Milestone } from '../services/pb'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'
import { GuidedCapture } from './GuidedCapture'
import { TaskTemplates } from './TaskTemplates'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from './ui/select'

const PRIORITY_OPTIONS = [
  { value: 'inbox',  label: '收集箱' },
  { value: 'must',   label: '核心大事' },
  { value: 'should', label: '应该做' },
  { value: 'could',  label: '顺便做' },
] as const

export function InboxPanel() {
  const { data: tasks, refetch } = usePB<Task[]>(
    () => tasksApi.list('status != "dropped"'), [], 'tasks'
  )
  const { data: milestones } = usePB<Milestone[]>(
    () => milestonesApi.list('pending'), [], 'milestones'
  )

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [why, setWhy] = useState('')
  const [estimatedMinutes, setEstimatedMinutes] = useState(0)
  const [milestoneId, setMilestoneId] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [showGuided, setShowGuided] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)

  async function addTask() {
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      await tasksApi.create({
        milestoneId: milestoneId || '', title: title.trim(),
        description: description.trim(), why: why.trim(),
        priorityType: 'inbox', status: 'pending', targetDate: '', streakCount: 0,
        estimatedMinutes, actualMinutes: 0,
      })
      setTitle(''); setDescription(''); setWhy(''); setEstimatedMinutes(0); setMilestoneId('')
      setShowForm(false); refetch()
    } finally { setSaving(false) }
  }

  async function handleGuidedComplete(items: { text: string; dimensionId: string }[]) {
    await Promise.all(items.map(item => tasksApi.create({
      milestoneId: '', title: item.text, description: '', why: '',
      priorityType: 'inbox', status: 'pending', targetDate: '', streakCount: 0,
      estimatedMinutes: 0, actualMinutes: 0,
    })))
    refetch(); setShowGuided(false)
  }

  async function saveEdit(id: string) {
    if (!editTitle.trim()) return
    await tasksApi.update(id, { title: editTitle.trim() })
    setEditingId(null); refetch()
  }

  async function changePriority(id: string, priorityType: Task['priorityType']) {
    const today = new Date().toISOString().split('T')[0]
    await tasksApi.update(id, { priorityType, targetDate: priorityType === 'inbox' ? '' : today })
    refetch()
  }

  const inboxTasks = tasks?.filter(t => t.priorityType === 'inbox') ?? []
  const promotedTasks = tasks?.filter(t => t.priorityType !== 'inbox') ?? []

  return (
    <div className="space-y-5 animate-fade-in">
      {showGuided && <GuidedCapture onComplete={handleGuidedComplete} onClose={() => setShowGuided(false)} />}
      {showTemplates && (
        <TaskTemplates
          onClose={() => setShowTemplates(false)}
          onAdded={count => { refetch(); if (count > 0) setShowTemplates(false) }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-zinc-100">今日收集箱</h2>
          <p className="text-sm text-zinc-500 mt-0.5">不加评判地倾倒所有待办。</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="secondary" size="sm" onClick={() => setShowTemplates(true)} title="从模板快速添加">
            <LayoutTemplate className="w-3.5 h-3.5" /> 模板
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowGuided(true)} title="引导式采集">
            <Brain className="w-3.5 h-3.5" /> 引导采集
          </Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-3.5 h-3.5" /> 快速添加
          </Button>
        </div>
      </div>

      {/* Quick add form */}
      {showForm && (
        <div className="card p-5 space-y-4 animate-slide-up">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">任务名称</label>
            <Input
              placeholder="例如：回复客户邮件、优化登陆页转化率..."
              value={title} onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addTask() }}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">备注（可选）</label>
            <Textarea rows={2} placeholder="补充说明..." value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">
              为什么重要？<span className="text-zinc-600 font-normal ml-1">执行时显示（可选）</span>
            </label>
            <Input placeholder="例如：这是MVP上线的最后一块拼图..." value={why} onChange={e => setWhy(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">
              预估用时<span className="text-zinc-600 font-normal ml-1">分钟，0 = 未填（可选）</span>
            </label>
            <EstimatedMinutesInput value={estimatedMinutes} onChange={setEstimatedMinutes} />
          </div>
          {milestones && milestones.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">关联里程碑（可选）</label>
              <Select value={milestoneId} onValueChange={setMilestoneId}>
                <SelectTrigger>
                  <SelectValue placeholder="不关联" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">不关联</SelectItem>
                  {milestones.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.title} ({m.timeFrame})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-600">⌘/Ctrl + Enter 快速保存</p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>取消</Button>
              <Button size="sm" onClick={addTask} disabled={!title.trim() || saving}>
                {saving ? '添加中...' : '添加到收集箱'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Inbox tasks */}
      {inboxTasks.length > 0 && (
        <>
          <div className="flex items-center gap-3 px-1">
            <span className="text-xs font-mono text-zinc-500">{inboxTasks.length} 条待分析</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>
          <div className="space-y-2">
            {inboxTasks.map((task, idx) => (
              <TaskRow key={task.id} task={task} idx={idx}
                editingId={editingId} editTitle={editTitle}
                setEditTitle={setEditTitle} setEditingId={setEditingId}
                saveEdit={saveEdit} dropTask={id => tasksApi.update(id, { status: 'dropped' }).then(refetch)}
                changePriority={changePriority}
              />
            ))}
          </div>
        </>
      )}

      {/* Promoted tasks */}
      {promotedTasks.length > 0 && (
        <>
          <div className="flex items-center gap-3 px-1 mt-2">
            <span className="text-xs font-mono text-zinc-500">已分配优先级</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>
          <div className="space-y-2">
            {promotedTasks.map((task, idx) => (
              <TaskRow key={task.id} task={task} idx={idx}
                editingId={editingId} editTitle={editTitle}
                setEditTitle={setEditTitle} setEditingId={setEditingId}
                saveEdit={saveEdit} dropTask={id => tasksApi.update(id, { status: 'dropped' }).then(refetch)}
                changePriority={changePriority}
              />
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {!tasks?.length && (
        <div className="card p-8 flex flex-col items-center text-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center">
            <Inbox className="w-6 h-6 text-zinc-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-300">收集箱为空</p>
            <p className="text-xs text-zinc-600 mt-1 max-w-xs">
              不知道从哪里开始？试试「引导采集」——它会带你从 6 个维度系统回忆所有待办。
            </p>
          </div>
          <Button onClick={() => setShowGuided(true)}>
            <Brain className="w-4 h-4" /> 开始引导采集
          </Button>
        </div>
      )}
    </div>
  )
}

// ── TaskRow ───────────────────────────────────────────────────────────────────

interface TaskRowProps {
  task: Task; idx: number
  editingId: string | null; editTitle: string
  setEditTitle: (v: string) => void; setEditingId: (v: string | null) => void
  saveEdit: (id: string) => void
  dropTask: (id: string) => void
  changePriority: (id: string, p: Task['priorityType']) => void
}

function TaskRow({ task, idx, editingId, editTitle, setEditTitle, setEditingId, saveEdit, dropTask, changePriority }: TaskRowProps) {
  const isStale = (task.streakCount ?? 0) >= 3
  const isCritical = (task.streakCount ?? 0) >= 7
  const [editingWhy, setEditingWhy] = useState(false)
  const [whyVal, setWhyVal] = useState(task.why ?? '')

  async function saveWhy() {
    await tasksApi.update(task.id, { why: whyVal.trim() })
    setEditingWhy(false)
  }

  const priorityVariantMap: Record<Task['priorityType'], 'must' | 'should' | 'could' | 'inbox'> = {
    must: 'must', should: 'should', could: 'could', inbox: 'inbox',
  }

  return (
    <div className={`card p-3 flex items-start gap-3 transition-all group
      ${isCritical ? 'border-red-500/25 bg-red-950/10' : isStale ? 'border-amber-500/20 bg-amber-950/10' : 'hover:border-zinc-700'}`}
    >
      <span className="text-xs font-mono text-zinc-700 w-5 text-right shrink-0 mt-1">{idx + 1}</span>
      <div className="flex-1 min-w-0">
        {editingId === task.id ? (
          <div className="flex gap-2">
            <Input className="h-7 text-sm" value={editTitle} onChange={e => setEditTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveEdit(task.id); if (e.key === 'Escape') setEditingId(null) }} autoFocus />
            <Button size="icon" className="h-7 w-7" onClick={() => saveEdit(task.id)}><Check className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="w-3.5 h-3.5" /></Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm text-zinc-200 cursor-pointer hover:text-white"
              onDoubleClick={() => { setEditingId(task.id); setEditTitle(task.title) }}
              title="双击编辑">
              {task.title}
            </p>
            {isCritical && (
              <Badge variant="danger" className="gap-1">
                <AlertOctagon className="w-3 h-3" /> 拖延{task.streakCount}天
              </Badge>
            )}
            {isStale && !isCritical && (
              <Badge variant="warning" className="gap-1">
                <AlertTriangle className="w-3 h-3" /> 拖延{task.streakCount}天
              </Badge>
            )}
          </div>
        )}
        {task.description && <p className="text-xs text-zinc-500 mt-0.5 truncate">{task.description}</p>}
        {/* Time tracking */}
        <TimeInfo task={task} onUpdate={() => {}} />
        {editingWhy ? (
          <div className="flex gap-2 mt-1.5">
            <Input className="h-7 text-xs flex-1" placeholder="这件事为什么重要？"
              value={whyVal} onChange={e => setWhyVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveWhy(); if (e.key === 'Escape') setEditingWhy(false) }} autoFocus />
            <Button size="icon" className="h-7 w-7" onClick={saveWhy}><Check className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingWhy(false)}><X className="w-3.5 h-3.5" /></Button>
          </div>
        ) : task.why ? (
          <p className="text-xs text-zinc-500 mt-1 italic cursor-pointer hover:text-zinc-400"
            onClick={() => { setEditingWhy(true); setWhyVal(task.why) }}>
            因为：{task.why}
          </p>
        ) : (
          <button onClick={() => setEditingWhy(true)}
            className="text-xs text-zinc-700 hover:text-zinc-500 mt-1 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1">
            <Plus className="w-3 h-3" /> 添加为什么重要
          </button>
        )}
      </div>

      <Select value={task.priorityType} onValueChange={v => changePriority(task.id, v as Task['priorityType'])}>
        <SelectTrigger className="h-7 w-24 text-xs border-transparent bg-transparent hover:bg-zinc-800 hover:border-zinc-700 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRIORITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Badge variant={priorityVariantMap[task.priorityType]} className="shrink-0">{task.priorityType}</Badge>

      <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-700 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 shrink-0"
        onClick={() => dropTask(task.id)}>
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  )
}

// ── Time helpers ──────────────────────────────────────────────────────────────

export function formatMinutes(mins: number): string {
  if (!mins || mins <= 0) return ''
  if (mins < 60) return `${mins}min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h${m}m` : `${h}h`
}

/** Quick preset buttons + manual number input for estimating time */
export function EstimatedMinutesInput({
  value, onChange,
}: { value: number; onChange: (v: number) => void }) {
  const presets = [15, 30, 45, 60, 90, 120]
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {presets.map(p => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(value === p ? 0 : p)}
          className={`h-7 px-2.5 rounded-md text-xs font-mono border transition-all
            ${value === p
              ? 'bg-zinc-200 text-zinc-900 border-zinc-200'
              : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'}`}
        >
          {formatMinutes(p)}
        </button>
      ))}
      <input
        type="number"
        min={0}
        max={480}
        placeholder="自定义"
        value={value > 0 && !presets.includes(value) ? value : ''}
        onChange={e => onChange(Number(e.target.value) || 0)}
        className="h-7 w-20 rounded-md border border-zinc-700 bg-zinc-800 px-2 text-xs font-mono text-zinc-300 focus:outline-none focus:border-zinc-500"
      />
    </div>
  )
}

/** Inline time accuracy display on a task row */
function TimeInfo({ task, onUpdate }: { task: Task; onUpdate: () => void }) {
  const [recording, setRecording] = useState(false)
  const [inputVal, setInputVal] = useState('')

  const est = task.estimatedMinutes
  const act = task.actualMinutes

  async function saveActual() {
    const mins = parseInt(inputVal, 10)
    if (!mins || mins <= 0) return
    await tasksApi.update(task.id, { actualMinutes: mins })
    setRecording(false)
    setInputVal('')
    onUpdate()
  }

  // Nothing to show if no time data at all
  if (!est && !act && !recording) {
    return null
  }

  const accuracy = est > 0 && act > 0
    ? Math.round((est / act) * 100)
    : null

  const accuracyColor =
    accuracy === null ? '' :
    accuracy >= 90 && accuracy <= 110 ? 'text-emerald-400' :
    accuracy >= 75 && accuracy <= 125 ? 'text-amber-400' :
    'text-red-400'

  return (
    <div className="flex items-center gap-2 mt-1 flex-wrap">
      {est > 0 && (
        <span className="text-xs font-mono text-zinc-600 flex items-center gap-1">
          <Clock className="w-3 h-3" /> 预估 {formatMinutes(est)}
        </span>
      )}
      {act > 0 && (
        <span className={`text-xs font-mono flex items-center gap-1 ${accuracyColor || 'text-zinc-500'}`}>
          实际 {formatMinutes(act)}
          {accuracy !== null && (
            <span className="text-zinc-600">({accuracy}%准确)</span>
          )}
        </span>
      )}
      {task.status === 'completed' && act === 0 && !recording && (
        <button
          onClick={() => setRecording(true)}
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-all flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> 记录实际用时
        </button>
      )}
      {recording && (
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={1}
            max={480}
            placeholder="分钟"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveActual(); if (e.key === 'Escape') setRecording(false) }}
            className="h-6 w-16 rounded border border-zinc-600 bg-zinc-800 px-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-400"
            autoFocus
          />
          <button onClick={saveActual} className="text-xs text-emerald-400 hover:text-emerald-300 font-mono">确认</button>
          <button onClick={() => setRecording(false)} className="text-xs text-zinc-600 hover:text-zinc-400">取消</button>
        </div>
      )}
    </div>
  )
}
