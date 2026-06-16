import { useState } from 'react'
import { Plus, Trash2, Mountain, Pencil, Check, X } from 'lucide-react'
import { usePB } from '../hooks/usePB'
import { pb, milestonesApi, visionsApi, type Milestone, type Vision } from '../services/pb'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

const CURRENT_YEAR = new Date().getFullYear()

function generateTimeFrameOptions() {
  const opts: string[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(); d.setMonth(d.getMonth() + i)
    opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  for (let q = 1; q <= 4; q++) {
    opts.push(`${CURRENT_YEAR}-Q${q}`, `${CURRENT_YEAR + 1}-Q${q}`)
  }
  return [...new Set(opts)]
}

const STATUS_STYLE: Record<Milestone['status'], 'success' | 'muted' | 'warning'> = {
  pending: 'warning', completed: 'success', archived: 'muted',
}
const STATUS_LABEL: Record<Milestone['status'], string> = {
  pending: '进行中', completed: '已完成', archived: '已归档',
}

export function MilestonePanel() {
  const { data: milestones, refetch } = usePB<Milestone[]>(() => milestonesApi.list(), [], 'milestones')
  const { data: visions } = usePB<Vision[]>(() => visionsApi.list(), [], 'visions')
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [timeFrame, setTimeFrame] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const timeFrameOptions = generateTimeFrameOptions()
  const activeVision = visions?.find(v => v.isActive)

  async function addMilestone() {
    if (!title.trim() || !timeFrame || saving) return
    setSaving(true)
    try {
      await milestonesApi.create({ visionId: activeVision?.id ?? '', title: title.trim(), timeFrame, status: 'pending' })
      setTitle(''); setShowForm(false); refetch()
    } finally { setSaving(false) }
  }

  async function saveEdit(id: string) {
    if (!editTitle.trim()) return
    await pb.collection('milestones').update(id, { title: editTitle.trim() })
    setEditingId(null); refetch()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">中期里程碑</h2>
          <p className="text-sm text-zinc-500 mt-0.5">把愿景拆解成季度和月度锚点。</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3.5 h-3.5" /> 新建里程碑
        </Button>
      </div>

      {activeVision && (
        <div className="flex items-start gap-3 p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
          <Badge variant="success" className="shrink-0 mt-0.5">ACTIVE</Badge>
          <p className="text-sm text-zinc-300 leading-relaxed">{activeVision.content}</p>
        </div>
      )}
      {!activeVision && (
        <div className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl">
          <p className="text-xs text-amber-400">请先在 Step 1 中设定并激活一个长期愿景。</p>
        </div>
      )}

      {showForm && (
        <div className="card p-5 space-y-4 animate-slide-up">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">里程碑标题</label>
            <Input
              placeholder="例如：完成 MVP 并获得首批 10 名付费用户"
              value={title} onChange={e => setTitle(e.target.value)} autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">时间区间</label>
            <Select value={timeFrame} onValueChange={setTimeFrame}>
              <SelectTrigger className="font-mono">
                <SelectValue placeholder="选择时间区间..." />
              </SelectTrigger>
              <SelectContent>
                {timeFrameOptions.map(tf => (
                  <SelectItem key={tf} value={tf} className="font-mono">{tf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>取消</Button>
            <Button size="sm" onClick={addMilestone} disabled={!title.trim() || !timeFrame || saving}>
              {saving ? '保存中...' : '保存里程碑'}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {!milestones?.length && (
          <div className="card p-8 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center">
              <Mountain className="w-6 h-6 text-zinc-500" />
            </div>
            <p className="text-sm font-medium text-zinc-300">尚未设定里程碑</p>
            <p className="text-xs text-zinc-600">将大目标切成 3 个月内可达的小山头。</p>
          </div>
        )}
        {milestones?.map(m => (
          <div key={m.id} className={`card p-4 transition-all hover:border-zinc-700 ${m.status === 'archived' ? 'opacity-50' : ''}`}>
            <div className="flex items-start gap-3">
              <button
                onClick={() => {
                  const next = m.status === 'pending' ? 'completed' : m.status === 'completed' ? 'archived' : 'pending'
                  milestonesApi.updateStatus(m.id, next).then(refetch)
                }}
                className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                  ${m.status === 'completed' ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600 hover:border-zinc-400'}`}
              >
                {m.status === 'completed' && <Check className="w-3 h-3 text-white" />}
              </button>

              <div className="flex-1 min-w-0">
                {editingId === m.id ? (
                  <div className="flex gap-2">
                    <Input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(m.id); if (e.key === 'Escape') setEditingId(null) }}
                      className="h-7 text-sm" autoFocus
                    />
                    <Button size="icon" className="h-7 w-7" onClick={() => saveEdit(m.id)}><Check className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="w-3.5 h-3.5" /></Button>
                  </div>
                ) : (
                  <p
                    className={`text-sm font-medium cursor-pointer hover:text-zinc-100 ${m.status === 'completed' ? 'line-through text-zinc-500' : 'text-zinc-200'}`}
                    onDoubleClick={() => { setEditingId(m.id); setEditTitle(m.title) }}
                  >
                    {m.title}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs font-mono text-zinc-600">{m.timeFrame}</span>
                  <Badge variant={STATUS_STYLE[m.status]}>{STATUS_LABEL[m.status]}</Badge>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-600 hover:text-zinc-300"
                  onClick={() => { setEditingId(m.id); setEditTitle(m.title) }}>
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-600 hover:text-red-400 hover:bg-red-500/10"
                  onClick={() => milestonesApi.delete(m.id).then(refetch)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
