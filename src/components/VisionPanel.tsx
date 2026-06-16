import { useState } from 'react';
import { usePB } from '../hooks/usePB';
import { visionsApi, type Vision } from '../services/pb';

export function VisionPanel() {
  const { data: visions, refetch } = usePB<Vision[]>(
    () => visionsApi.list(),
    [],
    'visions'
  );

  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState('');
  const [targetYear, setTargetYear] = useState(new Date().getFullYear() + 3);
  const [saving, setSaving] = useState(false);

  async function addVision() {
    if (!content.trim() || saving) return;
    setSaving(true);
    try {
      const isFirst = !visions || visions.length === 0;
      await visionsApi.create({
        content: content.trim(),
        target_year: targetYear,
        isActive: isFirst,
      });
      setContent('');
      setShowForm(false);
      refetch();
    } finally {
      setSaving(false);
    }
  }

  async function setActive(id: string) {
    await visionsApi.setActive(id);
    refetch();
  }

  async function deleteVision(id: string) {
    await visionsApi.delete(id);
    refetch();
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">长期愿景</h2>
          <p className="text-sm text-zinc-500 mt-1">你 3~10 年后想成为什么？定义你的北极星。</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新建愿景
        </button>
      </div>

      {showForm && (
        <div className="card p-5 space-y-4 animate-slide-up">
          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1.5">愿景描述</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="例如：成为一名能独立发布盈利产品的独立开发者，拥有财务自由和时间自由…"
              value={content}
              onChange={e => setContent(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1.5">目标达成年份</label>
            <input
              type="number"
              className="input-field w-32 font-mono"
              min={currentYear}
              max={currentYear + 30}
              value={targetYear}
              onChange={e => setTargetYear(Number(e.target.value))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="btn-ghost">取消</button>
            <button onClick={addVision} disabled={!content.trim() || saving} className="btn-primary">
              {saving ? '保存中...' : '保存愿景'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {(!visions || visions.length === 0) && (
          <div className="card p-8 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-2xl">🌠</div>
            <div>
              <p className="text-sm font-medium text-zinc-300">尚未定义愿景</p>
              <p className="text-xs text-zinc-600 mt-1">先告诉 AI 你的终极目标，才能做出最优的每日决策。</p>
            </div>
          </div>
        )}

        {visions?.map(v => (
          <div
            key={v.id}
            className={`card p-5 transition-all duration-200 ${v.isActive ? 'border-zinc-600 shadow-glow-green' : 'hover:border-zinc-700'}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {v.isActive ? (
                    <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-md text-xs font-mono font-semibold">
                      ACTIVE
                    </span>
                  ) : (
                    <span className="bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-md text-xs font-mono">DRAFT</span>
                  )}
                  <span className="text-xs font-mono text-zinc-500">目标 {v.target_year}</span>
                </div>
                <p className="text-sm text-zinc-200 leading-relaxed">{v.content}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!v.isActive && (
                  <button onClick={() => setActive(v.id)} className="btn-ghost text-xs">激活</button>
                )}
                <button
                  onClick={() => deleteVision(v.id)}
                  className="text-zinc-600 hover:text-red-400 w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-500/10 transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
