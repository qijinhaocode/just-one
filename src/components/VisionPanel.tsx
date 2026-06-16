import { useState } from 'react'
import { Plus, Star, Trash2, Zap } from 'lucide-react'
import { usePB } from '../hooks/usePB'
import { visionsApi, type Vision } from '../services/pb'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'

export function VisionPanel() {
  const { data: visions, refetch } = usePB<Vision[]>(() => visionsApi.list(), [], 'visions')
  const [showForm, setShowForm] = useState(false)
  const [content, setContent] = useState('')
  const [targetYear, setTargetYear] = useState(new Date().getFullYear() + 3)
  const [saving, setSaving] = useState(false)
  const currentYear = new Date().getFullYear()

  async function addVision() {
    if (!content.trim() || saving) return
    setSaving(true)
    try {
      await visionsApi.create({ content: content.trim(), target_year: targetYear, isActive: !visions?.length })
      setContent(''); setShowForm(false); refetch()
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">长期愿景</h2>
          <p className="text-sm text-zinc-500 mt-0.5">你的北极星目标。</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3.5 h-3.5" /> 新建愿景
        </Button>
      </div>

      {showForm && (
        <div className="card p-5 space-y-4 animate-slide-up">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">愿景描述</label>
            <Textarea
              rows={3}
              placeholder="例如：成为能独立发布盈利产品的独立开发者…"
              value={content}
              onChange={e => setContent(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">目标达成年份</label>
            <Input
              type="number"
              className="w-28 font-mono"
              min={currentYear}
              max={currentYear + 30}
              value={targetYear}
              onChange={e => setTargetYear(Number(e.target.value))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>取消</Button>
            <Button size="sm" onClick={addVision} disabled={!content.trim() || saving}>
              {saving ? '保存中...' : '保存愿景'}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {!visions?.length && (
          <div className="card p-8 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center">
              <Star className="w-6 h-6 text-zinc-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-300">尚未定义愿景</p>
              <p className="text-xs text-zinc-600 mt-1">先告诉 AI 你的终极目标，才能做出最优的每日决策。</p>
            </div>
          </div>
        )}
        {visions?.map(v => (
          <div key={v.id} className={`card p-5 transition-all duration-200 ${v.isActive ? 'border-zinc-600 shadow-glow-green' : 'hover:border-zinc-700'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  {v.isActive
                    ? <Badge variant="success"><Zap className="w-3 h-3" /> ACTIVE</Badge>
                    : <Badge variant="muted">DRAFT</Badge>}
                  <span className="text-xs font-mono text-zinc-500">目标 {v.target_year}</span>
                </div>
                <p className="text-sm text-zinc-200 leading-relaxed">{v.content}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!v.isActive && (
                  <Button variant="ghost" size="sm" onClick={() => visionsApi.setActive(v.id).then(refetch)}>
                    激活
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => visionsApi.delete(v.id).then(refetch)} className="text-zinc-600 hover:text-red-400 hover:bg-red-500/10">
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
