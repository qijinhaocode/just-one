import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Task } from '../db';

interface FocusBoardProps {
  notToDoRules: string[];
  onRunAI: () => void;
  aiLoading: boolean;
  aiError: string | null;
  analysisSummary: string | null;
}

function TaskCard({ task, size = 'normal' }: { task: Task; size?: 'large' | 'normal' }) {
  const [completing, setCompleting] = useState(false);

  async function toggleComplete() {
    if (completing) return;
    setCompleting(true);
    const next = task.status === 'completed' ? 'pending' : 'completed';
    await db.tasks.update(task.id!, { status: next });
    setTimeout(() => setCompleting(false), 400);
  }

  const isCompleted = task.status === 'completed';

  if (size === 'large') {
    return (
      <div className={`relative card p-6 border-red-500/30 bg-gradient-to-br from-zinc-900 to-zinc-950 shadow-must transition-all duration-300 ${isCompleted ? 'opacity-70' : ''}`}>
        {!isCompleted && (
          <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-red-400 animate-pulse-slow" />
        )}
        <div className="flex items-start gap-4">
          <button
            onClick={toggleComplete}
            className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 shrink-0 mt-0.5
              ${isCompleted
                ? 'bg-emerald-500 border-emerald-500'
                : 'border-red-500/60 hover:border-red-400 hover:bg-red-500/10'}`}
          >
            {(isCompleted || completing) && (
              <svg className="w-4 h-4 text-white animate-check-pop" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
          <div className="flex-1">
            <span className="tag-must mb-3 inline-block">MUST · 1 件大事</span>
            <p className={`text-xl font-bold leading-snug ${isCompleted ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>
              {task.title}
            </p>
            {task.description && (
              <p className="text-sm text-zinc-500 mt-2 leading-relaxed">{task.description}</p>
            )}
            {task.streakCount > 0 && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-500 font-mono">
                <span>⚠</span> 已连续拖延 {task.streakCount} 天
              </div>
            )}
          </div>
        </div>
        {isCompleted && (
          <div className="mt-4 flex items-center gap-2 text-sm text-emerald-400 font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            主线大事已完成！继续保持节奏。
          </div>
        )}
      </div>
    );
  }

  const typeColors: Record<Task['priorityType'], string> = {
    must: 'border-red-500/20',
    should: 'border-amber-500/20',
    could: 'border-emerald-500/20',
    inbox: 'border-zinc-700',
  };

  return (
    <div className={`card p-4 flex items-start gap-3 transition-all duration-150 hover:border-zinc-700 ${typeColors[task.priorityType]} ${isCompleted ? 'opacity-60' : ''}`}>
      <button
        onClick={toggleComplete}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 shrink-0 mt-0.5
          ${isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600 hover:border-zinc-400'}`}
      >
        {isCompleted && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isCompleted ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-zinc-600 mt-0.5 truncate">{task.description}</p>
        )}
      </div>
    </div>
  );
}

export function FocusBoard({ notToDoRules, onRunAI, aiLoading, aiError, analysisSummary }: FocusBoardProps) {
  const today = new Date().toISOString().split('T')[0];

  const mustTasks = useLiveQuery(
    () => db.tasks.where('priorityType').equals('must').filter(t => t.status !== 'dropped' && (t.targetDate === today || !t.targetDate)).toArray(),
    [today]
  );
  const shouldTasks = useLiveQuery(
    () => db.tasks.where('priorityType').equals('should').filter(t => t.status !== 'dropped' && (t.targetDate === today || !t.targetDate)).toArray(),
    [today]
  );
  const couldTasks = useLiveQuery(
    () => db.tasks.where('priorityType').equals('could').filter(t => t.status !== 'dropped' && (t.targetDate === today || !t.targetDate)).toArray(),
    [today]
  );
  const inboxCount = useLiveQuery(
    () => db.tasks.where('priorityType').equals('inbox').filter(t => t.status !== 'dropped').count(),
    []
  );

  const hasAnyFocusTasks = (mustTasks?.length ?? 0) + (shouldTasks?.length ?? 0) + (couldTasks?.length ?? 0) > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">今日聚焦看板</h2>
          <p className="text-sm text-zinc-500 mt-1">
            {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
        </div>
        <button
          onClick={onRunAI}
          disabled={aiLoading || (inboxCount ?? 0) === 0}
          className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {aiLoading ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              AI 思考中...
            </>
          ) : (
            <>
              <span className="text-sm">✦</span>
              开始 AI 对齐分析
              {(inboxCount ?? 0) > 0 && <span className="bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded text-xs font-mono">{inboxCount}</span>}
            </>
          )}
        </button>
      </div>

      {/* AI error */}
      {aiError && (
        <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl animate-slide-up">
          <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-red-400">{aiError}</p>
        </div>
      )}

      {/* AI summary */}
      {analysisSummary && (
        <div className="card p-4 bg-zinc-800/40 border-zinc-700/60 animate-slide-up">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono text-zinc-500">✦ AI 对齐分析</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">{analysisSummary}</p>
        </div>
      )}

      {/* No tasks state */}
      {!hasAnyFocusTasks && (
        <div className="card p-10 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center text-3xl">🎯</div>
          <div>
            <p className="text-base font-semibold text-zinc-300">今日聚焦清单为空</p>
            <p className="text-sm text-zinc-600 mt-1.5 max-w-xs">
              先在「收集箱」中添加待办，再点击「AI 对齐分析」让 AI 帮你筛选出最重要的 1-3-5。
            </p>
          </div>
          {(inboxCount ?? 0) > 0 && (
            <button onClick={onRunAI} disabled={aiLoading} className="btn-primary">
              立即分析 {inboxCount} 条收集箱任务
            </button>
          )}
        </div>
      )}

      {/* Must - 1 件大事 */}
      {mustTasks && mustTasks.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-xs font-mono font-semibold text-red-400 uppercase tracking-wider">JustOne 核心大事</span>
          </div>
          <TaskCard task={mustTasks[0]} size="large" />
        </section>
      )}

      {/* Should - 3 件中事 */}
      {shouldTasks && shouldTasks.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs font-mono font-semibold text-amber-400 uppercase tracking-wider">
              应该做 · {shouldTasks.length} 件中事
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {shouldTasks.slice(0, 3).map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}

      {/* Could - 5 件小事 */}
      {couldTasks && couldTasks.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
              顺便做 · {couldTasks.length} 件小事
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {couldTasks.slice(0, 5).map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}

      {/* Not-To-Do rules */}
      {notToDoRules.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-zinc-600" />
            <span className="text-xs font-mono font-semibold text-zinc-500 uppercase tracking-wider">今日拒绝清单</span>
          </div>
          <div className="card p-4 space-y-2">
            {notToDoRules.map((rule, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-zinc-600 text-xs font-mono mt-0.5 shrink-0">🚫</span>
                <p className="text-xs text-zinc-500">{rule}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
