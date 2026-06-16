import { useState } from 'react';
import { usePB } from '../hooks/usePB';
import { tasksApi, milestonesApi, type Task, type Milestone } from '../services/pb';
import { GuidedCapture } from './GuidedCapture';

const PRIORITY_OPTIONS = [
  { value: 'inbox',  label: '收集箱',  style: 'tag-inbox' },
  { value: 'must',   label: '核心大事', style: 'tag-must' },
  { value: 'should', label: '应该做',  style: 'tag-should' },
  { value: 'could',  label: '顺便做',  style: 'tag-could' },
] as const;

export function InboxPanel() {
  const { data: tasks, refetch } = usePB<Task[]>(
    () => tasksApi.list('status != "dropped"'),
    [],
    'tasks'
  );
  const { data: milestones } = usePB<Milestone[]>(
    () => milestonesApi.list('pending'),
    [],
    'milestones'
  );

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [milestoneId, setMilestoneId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showGuided, setShowGuided] = useState(false);

  async function addTask() {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await tasksApi.create({
        milestoneId: milestoneId || '',
        title: title.trim(),
        description: description.trim(),
        priorityType: 'inbox',
        status: 'pending',
        targetDate: '',
        streakCount: 0,
      });
      setTitle('');
      setDescription('');
      setMilestoneId('');
      setShowForm(false);
      refetch();
    } finally {
      setSaving(false);
    }
  }

  async function handleGuidedComplete(items: { text: string; dimensionId: string }[]) {
    await Promise.all(
      items.map(item =>
        tasksApi.create({
          milestoneId: '',
          title: item.text,
          description: '',
          priorityType: 'inbox',
          status: 'pending',
          targetDate: '',
          streakCount: 0,
        })
      )
    );
    refetch();
    setShowGuided(false);
  }

  async function dropTask(id: string) {
    await tasksApi.update(id, { status: 'dropped' });
    refetch();
  }

  async function changePriority(id: string, priorityType: Task['priorityType']) {
    const today = new Date().toISOString().split('T')[0];
    await tasksApi.update(id, {
      priorityType,
      targetDate: priorityType === 'inbox' ? '' : today,
    });
    refetch();
  }

  async function saveEdit(id: string) {
    if (!editTitle.trim()) return;
    await tasksApi.update(id, { title: editTitle.trim() });
    setEditingId(null);
    refetch();
  }

  async function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) await addTask();
  }

  const inboxTasks = tasks?.filter(t => t.priorityType === 'inbox') ?? [];
  const promotedTasks = tasks?.filter(t => t.priorityType !== 'inbox') ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Guided capture modal */}
      {showGuided && (
        <GuidedCapture
          onComplete={handleGuidedComplete}
          onClose={() => setShowGuided(false)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">今日收集箱</h2>
          <p className="text-sm text-zinc-500 mt-1">不加评判地倾倒所有待办，让 AI 帮你过滤优先级。</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGuided(true)}
            className="btn-ghost flex items-center gap-1.5 text-sm border border-zinc-700 hover:border-zinc-600"
            title="按维度引导你系统性采集所有待办"
          >
            <span className="text-base leading-none">🧠</span>
            引导采集
          </button>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            快速添加
          </button>
        </div>
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
            <label className="text-xs font-medium text-zinc-400 block mb-1.5">备注（可选）</label>
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
              <button onClick={addTask} disabled={!title.trim() || saving} className="btn-primary">
                {saving ? '添加中...' : '添加到收集箱'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inbox tasks */}
      {inboxTasks.length > 0 && (
        <>
          <div className="flex items-center gap-4 px-1">
            <span className="text-xs font-mono text-zinc-500">{inboxTasks.length} 条待分析</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>
          <div className="space-y-2">
            {inboxTasks.map((task, idx) => (
              <TaskRow
                key={task.id}
                task={task}
                idx={idx}
                editingId={editingId}
                editTitle={editTitle}
                setEditTitle={setEditTitle}
                setEditingId={setEditingId}
                saveEdit={saveEdit}
                dropTask={dropTask}
                changePriority={changePriority}
              />
            ))}
          </div>
        </>
      )}

      {/* Promoted tasks (already have a priority) */}
      {promotedTasks.length > 0 && (
        <>
          <div className="flex items-center gap-4 px-1 mt-2">
            <span className="text-xs font-mono text-zinc-500">已分配优先级</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>
          <div className="space-y-2">
            {promotedTasks.map((task, idx) => (
              <TaskRow
                key={task.id}
                task={task}
                idx={idx}
                editingId={editingId}
                editTitle={editTitle}
                setEditTitle={setEditTitle}
                setEditingId={setEditingId}
                saveEdit={saveEdit}
                dropTask={dropTask}
                changePriority={changePriority}
              />
            ))}
          </div>
        </>
      )}

      {(!tasks || tasks.length === 0) && (
        <div className="card p-8 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-2xl">📥</div>
          <div>
            <p className="text-sm font-medium text-zinc-300">收集箱为空</p>
            <p className="text-xs text-zinc-600 mt-1 max-w-xs">
              不知道从哪里开始？试试「引导采集」——它会带你从 6 个维度系统回忆所有待办。
            </p>
          </div>
          <button
            onClick={() => setShowGuided(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <span>🧠</span> 开始引导采集
          </button>
        </div>
      )}
    </div>
  );
}

interface TaskRowProps {
  task: Task;
  idx: number;
  editingId: string | null;
  editTitle: string;
  setEditTitle: (v: string) => void;
  setEditingId: (v: string | null) => void;
  saveEdit: (id: string) => void;
  dropTask: (id: string) => void;
  changePriority: (id: string, p: Task['priorityType']) => void;
}

function TaskRow({ task, idx, editingId, editTitle, setEditTitle, setEditingId, saveEdit, dropTask, changePriority }: TaskRowProps) {
  const tagClass: Record<Task['priorityType'], string> = {
    inbox: 'tag-inbox', must: 'tag-must', should: 'tag-should', could: 'tag-could',
  };

  return (
    <div className="card p-3 flex items-center gap-3 hover:border-zinc-700 transition-all group">
      <span className="text-xs font-mono text-zinc-700 w-5 text-right shrink-0">{idx + 1}</span>
      <div className="flex-1 min-w-0">
        {editingId === task.id ? (
          <div className="flex gap-2">
            <input
              className="input-field text-sm py-1"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveEdit(task.id); if (e.key === 'Escape') setEditingId(null); }}
              autoFocus
            />
            <button onClick={() => saveEdit(task.id)} className="btn-primary text-xs px-2 py-1">保存</button>
            <button onClick={() => setEditingId(null)} className="btn-ghost text-xs">取消</button>
          </div>
        ) : (
          <p
            className="text-sm text-zinc-200 truncate cursor-pointer"
            onDoubleClick={() => { setEditingId(task.id); setEditTitle(task.title); }}
            title="双击编辑"
          >
            {task.title}
          </p>
        )}
        {task.description && <p className="text-xs text-zinc-500 mt-0.5 truncate">{task.description}</p>}
        {task.streakCount > 0 && (
          <span className="text-xs text-amber-500 font-mono">⚠ 已拖延 {task.streakCount} 天</span>
        )}
      </div>

      {/* Priority selector */}
      <select
        className="bg-transparent border-none text-xs font-mono cursor-pointer outline-none"
        value={task.priorityType}
        onChange={e => changePriority(task.id, e.target.value as Task['priorityType'])}
        title="手动调整优先级"
      >
        {PRIORITY_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <span className={tagClass[task.priorityType] + ' shrink-0'}>{task.priorityType}</span>

      <button
        onClick={() => dropTask(task.id)}
        className="text-zinc-700 hover:text-red-400 w-6 h-6 flex items-center justify-center rounded transition-all opacity-0 group-hover:opacity-100 shrink-0"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
