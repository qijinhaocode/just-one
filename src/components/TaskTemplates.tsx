import { useState } from 'react';
import { usePB } from '../hooks/usePB';
import { templatesApi, tasksApi, type TaskTemplate } from '../services/pb';

const CATEGORIES = ['工作', '学习', '生活', '健康', '沟通', '其他'];

interface TaskTemplatesProps {
  onClose: () => void;
  onAdded: (count: number) => void;
}

export function TaskTemplates({ onClose, onAdded }: TaskTemplatesProps) {
  const { data: templates, refetch } = usePB<TaskTemplate[]>(
    () => templatesApi.list(),
    [], 'task_templates'
  );

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [why, setWhy] = useState('');
  const [category, setCategory] = useState('工作');
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchAdding, setBatchAdding] = useState(false);

  async function createTemplate() {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await templatesApi.create({ title: title.trim(), description, why, category, useCount: 0 });
      setTitle(''); setDescription(''); setWhy('');
      setShowForm(false);
      refetch();
    } finally {
      setSaving(false);
    }
  }

  async function useTemplate(id: string) {
    setAdding(id);
    try {
      const payload = await templatesApi.useTemplate(id);
      await tasksApi.create(payload);
      onAdded(1);
    } finally {
      setAdding(null);
      refetch();
    }
  }

  async function batchUse() {
    if (selectedIds.size === 0) return;
    setBatchAdding(true);
    try {
      await Promise.all([...selectedIds].map(id => templatesApi.useTemplate(id).then(p => tasksApi.create(p))));
      onAdded(selectedIds.size);
      setSelectedIds(new Set());
    } finally {
      setBatchAdding(false);
      refetch();
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const byCategory = CATEGORIES.reduce<Record<string, TaskTemplate[]>>((acc, cat) => {
    acc[cat] = templates?.filter(t => t.category === cat) ?? [];
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">任务模板</h2>
            <p className="text-xs text-zinc-500 mt-0.5">常用任务一键加入收集箱</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn-ghost text-xs flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新建模板
            </button>
            <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 w-7 h-7 flex items-center justify-center rounded-md hover:bg-zinc-800 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {/* New template form */}
          {showForm && (
            <div className="card p-4 space-y-3 animate-slide-up">
              <input
                className="input-field"
                placeholder="模板标题 *"
                value={title}
                onChange={e => setTitle(e.target.value)}
                autoFocus
              />
              <input
                className="input-field"
                placeholder="备注（可选）"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
              <input
                className="input-field"
                placeholder="为什么重要？（可选）"
                value={why}
                onChange={e => setWhy(e.target.value)}
              />
              <div className="flex gap-2 items-center">
                <select className="input-field w-auto" value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={() => setShowForm(false)} className="btn-ghost text-xs ml-auto">取消</button>
                <button onClick={createTemplate} disabled={!title.trim() || saving} className="btn-primary text-xs px-3 py-1.5">
                  {saving ? '保存中...' : '保存模板'}
                </button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {(!templates || templates.length === 0) && (
            <div className="text-center py-10 text-zinc-600 space-y-2">
              <div className="text-3xl">📋</div>
              <p className="text-sm">还没有模板</p>
              <p className="text-xs">把常用任务保存为模板，下次一键加入收集箱。</p>
              <button onClick={() => setShowForm(true)} className="btn-primary text-xs mt-2">创建第一个模板</button>
            </div>
          )}

          {/* Templates by category */}
          {CATEGORIES.map(cat => {
            const items = byCategory[cat];
            if (items.length === 0) return null;
            return (
              <div key={cat} className="space-y-2">
                <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">{cat}</p>
                <div className="space-y-1.5">
                  {items.map(t => (
                    <div
                      key={t.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer
                        ${selectedIds.has(t.id)
                          ? 'bg-zinc-700/40 border-zinc-600'
                          : 'bg-zinc-800/30 border-zinc-800 hover:border-zinc-700'}`}
                      onClick={() => toggleSelect(t.id)}
                    >
                      {/* Checkbox */}
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all
                        ${selectedIds.has(t.id) ? 'bg-zinc-300 border-zinc-300' : 'border-zinc-600'}`}
                      >
                        {selectedIds.has(t.id) && (
                          <svg className="w-2.5 h-2.5 text-zinc-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-200 truncate">{t.title}</p>
                        {t.description && (
                          <p className="text-xs text-zinc-500 truncate mt-0.5">{t.description}</p>
                        )}
                        {t.why && (
                          <p className="text-xs text-zinc-600 italic truncate mt-0.5">因为：{t.why}</p>
                        )}
                      </div>

                      {t.useCount > 0 && (
                        <span className="text-xs font-mono text-zinc-600 shrink-0">×{t.useCount}</span>
                      )}

                      <button
                        onClick={e => { e.stopPropagation(); useTemplate(t.id); }}
                        disabled={adding === t.id}
                        className="btn-ghost text-xs px-2 py-1 shrink-0 text-zinc-400 hover:text-zinc-100"
                        title="单独加入收集箱"
                      >
                        {adding === t.id ? '...' : '+'}
                      </button>

                      <button
                        onClick={e => { e.stopPropagation(); templatesApi.delete(t.id).then(() => refetch()); }}
                        className="text-zinc-700 hover:text-red-400 w-5 h-5 flex items-center justify-center rounded transition-all shrink-0"
                        title="删除模板"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer — batch add */}
        <div className="px-6 py-4 border-t border-zinc-800 flex items-center gap-3">
          {selectedIds.size > 0 ? (
            <>
              <span className="text-xs text-zinc-500">已选 {selectedIds.size} 个</span>
              <button onClick={() => setSelectedIds(new Set())} className="btn-ghost text-xs">取消选择</button>
              <button
                onClick={batchUse}
                disabled={batchAdding}
                className="btn-primary text-sm flex-1 flex items-center justify-center gap-2"
              >
                {batchAdding ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    加入中...
                  </>
                ) : (
                  `加入收集箱 (${selectedIds.size})`
                )}
              </button>
            </>
          ) : (
            <p className="text-xs text-zinc-600 flex-1">勾选模板后批量加入收集箱，或点击单个「+」单独添加</p>
          )}
        </div>
      </div>
    </div>
  );
}
