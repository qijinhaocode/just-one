import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Task } from '../db';

export function InboxPanel() {
  const tasks = useLiveQuery(
    () => db.tasks.where('priorityType').equals('inbox').filter(t => t.status !== 'dropped').toArray(),
    []
  );
  const milestones = useLiveQuery(
    () => db.milestones.where('status').equals('pending').toArray(),
    []
  );

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [milestoneId, setMilestoneId] = useState('');
  const [showForm, setShowForm] = useState(false);

  async function addTask() {
    if (!title.trim()) return;
    const task: Task = {
      id: crypto.randomUUID(),
      milestoneId: milestoneId || undefined,
      title: title.trim(),
      description: description.trim() || undefined,
      priorityType: 'inbox',
      status: 'pending',
      streakCount: 0,
      createdAt: new Date(),
    };
    await db.tasks.add(task);
    setTitle('');
    setDescription('');
    setMilestoneId('');
    setShowForm(false);
  }

  async function dropTask(id: string) {
    await db.tasks.update(id, { status: 'dropped' });
  }

  async function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      await addTask();
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">今日收集箱</h2>
          <p className="text-sm text-zinc-500 mt-1">不加评判地倾倒所有待办，让 AI 帮你过滤优先级。</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          添加任务
        </button>
      </div>

      {showForm && (
        <div className="card p-5 space-y-4 animate-slide-up">
          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1.5">任务名称</label>
            <input
              className="input-field"
              placeholder="例如：回复客户邮件、优化登陆页面转化率..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1.5">备注 / 详情（可选）</label>
            <textarea
              className="input-field resize-none"
              rows={2}
              placeholder="补充说明..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
          {milestones && milestones.length > 0 && (
            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-1.5">关联里程碑（可选）</label>
              <select className="input-field" value={milestoneId} onChange={e => setMilestoneId(e.target.value)}>
                <option value="">不关联</option>
                {milestones.map(m => (
                  <option key={m.id} value={m.id}>{m.title} ({m.timeFrame})</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-600">⌘/Ctrl + Enter 快速保存</p>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="btn-ghost">取消</button>
              <button onClick={addTask} disabled={!title.trim()} className="btn-primary">添加到收集箱</button>
            </div>
          </div>
        </div>
      )}

      {/* Stats bar */}
      {tasks && tasks.length > 0 && (
        <div className="flex items-center gap-4 px-1">
          <span className="text-xs font-mono text-zinc-500">
            {tasks.length} 条待办 · 等待 AI 对齐分析
          </span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>
      )}

      <div className="space-y-2">
        {tasks?.length === 0 && (
          <div className="card p-8 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-2xl">📥</div>
            <div>
              <p className="text-sm font-medium text-zinc-300">收集箱为空</p>
              <p className="text-xs text-zinc-600 mt-1">把今天想做的所有事情都倒进来，不需要排序。</p>
            </div>
          </div>
        )}

        {tasks?.map((task, idx) => (
          <div key={task.id} className="card p-4 flex items-start gap-3 hover:border-zinc-700 transition-all duration-150 group">
            <span className="text-xs font-mono text-zinc-700 w-5 text-right mt-0.5 shrink-0">{idx + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-200">{task.title}</p>
              {task.description && (
                <p className="text-xs text-zinc-500 mt-0.5 truncate">{task.description}</p>
              )}
              {task.streakCount > 0 && (
                <span className="inline-flex items-center gap-1 mt-1 text-xs text-amber-500 font-mono">
                  <span>⚠</span> 已拖延 {task.streakCount} 天
                </span>
              )}
            </div>
            <span className="tag-inbox shrink-0">inbox</span>
            <button
              onClick={() => dropTask(task.id!)}
              className="text-zinc-700 hover:text-red-400 w-6 h-6 flex items-center justify-center rounded transition-all opacity-0 group-hover:opacity-100"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
