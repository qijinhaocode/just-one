import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Milestone } from '../db';

const CURRENT_YEAR = new Date().getFullYear();

function generateTimeFrameOptions() {
  const options: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    options.push(`${y}-${m}`);
  }
  for (let q = 1; q <= 4; q++) {
    options.push(`${CURRENT_YEAR}-Q${q}`);
    options.push(`${CURRENT_YEAR + 1}-Q${q}`);
  }
  return [...new Set(options)];
}

export function MilestonePanel() {
  const milestones = useLiveQuery(() => db.milestones.orderBy('createdAt').reverse().toArray(), []);
  const visions = useLiveQuery(() => db.visions.where('isActive').equals(1).toArray(), []);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [timeFrame, setTimeFrame] = useState('');

  const timeFrameOptions = generateTimeFrameOptions();
  const activeVision = visions?.[0];

  async function addMilestone() {
    if (!title.trim() || !timeFrame) return;
    const milestone: Milestone = {
      id: crypto.randomUUID(),
      visionId: activeVision?.id,
      title: title.trim(),
      timeFrame,
      status: 'pending',
      createdAt: new Date(),
    };
    await db.milestones.add(milestone);
    setTitle('');
    setShowForm(false);
  }

  async function toggleStatus(id: string, current: Milestone['status']) {
    const next = current === 'pending' ? 'completed' : current === 'completed' ? 'archived' : 'pending';
    await db.milestones.update(id, { status: next });
  }

  async function deleteMilestone(id: string) {
    await db.milestones.delete(id);
  }

  const statusStyle: Record<Milestone['status'], string> = {
    pending: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    archived: 'bg-zinc-700/50 text-zinc-500 border-zinc-600/50',
  };

  const statusLabel: Record<Milestone['status'], string> = {
    pending: '进行中',
    completed: '已完成',
    archived: '已归档',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">中期里程碑</h2>
          <p className="text-sm text-zinc-500 mt-1">把愿景拆解成季度和月度的可执行锚点。</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新建里程碑
        </button>
      </div>

      {activeVision && (
        <div className="flex items-start gap-3 p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
          <span className="text-emerald-400 text-lg">🌠</span>
          <div>
            <p className="text-xs font-mono text-emerald-500 mb-0.5">当前愿景 · {activeVision.target_year}</p>
            <p className="text-sm text-zinc-300 leading-relaxed">{activeVision.content}</p>
          </div>
        </div>
      )}

      {!activeVision && (
        <div className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl">
          <p className="text-xs text-amber-400">请先在 Step 1 中设定并激活一个长期愿景。</p>
        </div>
      )}

      {showForm && (
        <div className="card p-5 space-y-4 animate-slide-up">
          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1.5">里程碑标题</label>
            <input
              className="input-field"
              placeholder="例如：完成 MVP 并获得首批 10 名付费用户"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1.5">时间区间</label>
            <select
              className="input-field font-mono"
              value={timeFrame}
              onChange={e => setTimeFrame(e.target.value)}
            >
              <option value="">选择时间区间...</option>
              {timeFrameOptions.map(tf => (
                <option key={tf} value={tf}>{tf}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="btn-ghost">取消</button>
            <button onClick={addMilestone} disabled={!title.trim() || !timeFrame} className="btn-primary">保存里程碑</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {milestones?.length === 0 && (
          <div className="card p-8 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-2xl">🏔️</div>
            <div>
              <p className="text-sm font-medium text-zinc-300">尚未设定里程碑</p>
              <p className="text-xs text-zinc-600 mt-1">将大目标切成 3 个月内可达的小山头。</p>
            </div>
          </div>
        )}
        {milestones?.map(m => (
          <div key={m.id} className={`card p-4 transition-all duration-200 hover:border-zinc-700 ${m.status === 'archived' ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <button
                  onClick={() => toggleStatus(m.id!, m.status)}
                  className="mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 border-zinc-600 hover:border-zinc-400 flex items-center justify-center transition-all"
                >
                  {m.status === 'completed' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-check-pop" />
                  )}
                </button>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${m.status === 'completed' ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                    {m.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs font-mono text-zinc-600">{m.timeFrame}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-md border font-mono ${statusStyle[m.status]}`}>
                      {statusLabel[m.status]}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => deleteMilestone(m.id!)}
                className="text-zinc-600 hover:text-red-400 w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-500/10 transition-all shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
