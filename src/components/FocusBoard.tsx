import { useState } from 'react';
import { usePB } from '../hooks/usePB';
import { tasksApi, type Task } from '../services/pb';
import { StreakBadge, DayScore } from './StreakAndScore';
import type { StreakData } from '../services/streak';

interface FocusBoardProps {
  notToDoRules: string[];
  onRunAI: () => void;
  aiLoading: boolean;
  aiError: string | null;
  analysisSummary: string | null;
  streak: StreakData | null;
}

function TaskCard({ task, size = 'normal' }: { task: Task; size?: 'large' | 'normal' }) {
  const [completing, setCompleting] = useState(false);

  async function toggleComplete() {
    if (completing) return;
    setCompleting(true);
    const next = task.status === 'completed' ? 'pending' : 'completed';
    await tasksApi.update(task.id, { status: next });
    setTimeout(() => setCompleting(false), 400);
  }

  const isCompleted = task.status === 'completed';
  const isStale = (task.streakCount ?? 0) >= 3;
  const isCriticallyStale = (task.streakCount ?? 0) >= 7;

  if (size === 'large') {
    return (
      <div className={`relative card p-6 transition-all duration-300
        ${isCriticallyStale ? 'border-red-500/50 bg-gradient-to-br from-red-950/30 to-zinc-950 shadow-must' :
          isStale ? 'border-amber-500/30 bg-gradient-to-br from-amber-950/20 to-zinc-950' :
          'border-red-500/30 bg-gradient-to-br from-zinc-900 to-zinc-950 shadow-must'}
        ${isCompleted ? 'opacity-70' : ''}`}
      >
        {!isCompleted && (
          <div className={`absolute top-3 right-3 w-2 h-2 rounded-full animate-pulse-slow
            ${isCriticallyStale ? 'bg-red-500' : 'bg-red-400'}`} />
        )}

        {/* Procrastination warning banner */}
        {isStale && !isCompleted && (
          <div className={`flex items-center gap-2 mb-4 px-3 py-2 rounded-lg text-xs font-mono
            ${isCriticallyStale
              ? 'bg-red-500/15 border border-red-500/30 text-red-400'
              : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'}`}
          >
            <span>{isCriticallyStale ? '🚨' : '⚠️'}</span>
            <span>
              {isCriticallyStale
                ? `已拖延 ${task.streakCount} 天 — 再不做就彻底失控了`
                : `已拖延 ${task.streakCount} 天 — 今天必须解决`}
            </span>
          </div>
        )}

        <div className="flex items-start gap-4">
          <button
            onClick={toggleComplete}
            className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 shrink-0 mt-0.5
              ${isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-red-500/60 hover:border-red-400 hover:bg-red-500/10'}`}
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
            {/* Why anchor */}
            {task.why && !isCompleted && (
              <div className="mt-3 flex items-start gap-2 px-3 py-2 bg-zinc-800/60 border border-zinc-700/60 rounded-lg">
                <span className="text-zinc-500 text-xs mt-0.5 shrink-0">因为</span>
                <p className="text-xs text-zinc-300 leading-relaxed italic">{task.why}</p>
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

  const borderByType: Record<Task['priorityType'], string> = {
    must: 'border-red-500/20', should: 'border-amber-500/20',
    could: 'border-emerald-500/20', inbox: 'border-zinc-700',
  };

  return (
    <div className={`card p-4 flex items-start gap-3 transition-all duration-150
      ${isStale && !isCompleted ? 'border-amber-500/25 bg-amber-950/10' : `hover:border-zinc-700 ${borderByType[task.priorityType]}`}
      ${isCompleted ? 'opacity-60' : ''}`}
    >
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
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-sm font-medium ${isCompleted ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
            {task.title}
          </p>
          {isStale && !isCompleted && (
            <span className={`text-xs font-mono px-1.5 py-0.5 rounded border shrink-0
              ${isCriticallyStale
                ? 'bg-red-500/15 text-red-400 border-red-500/25'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}
            >
              拖延{task.streakCount}天
            </span>
          )}
        </div>
        {task.description && (
          <p className="text-xs text-zinc-600 mt-0.5 truncate">{task.description}</p>
        )}
        {task.why && !isCompleted && (
          <p className="text-xs text-zinc-500 mt-1 italic">因为：{task.why}</p>
        )}
      </div>
    </div>
  );
}

export function FocusBoard({ notToDoRules, onRunAI, aiLoading, aiError, analysisSummary, streak }: FocusBoardProps) {
  const today = new Date().toISOString().split('T')[0];

  const { data: mustTasks } = usePB<Task[]>(
    () => tasksApi.list(`priorityType = "must" && status != "dropped" && (targetDate = "${today}" || targetDate = "")`),
    [today], 'tasks'
  );
  const { data: shouldTasks } = usePB<Task[]>(
    () => tasksApi.list(`priorityType = "should" && status != "dropped" && (targetDate = "${today}" || targetDate = "")`),
    [today], 'tasks'
  );
  const { data: couldTasks } = usePB<Task[]>(
    () => tasksApi.list(`priorityType = "could" && status != "dropped" && (targetDate = "${today}" || targetDate = "")`),
    [today], 'tasks'
  );
  const { data: inboxCount } = usePB<number>(
    () => tasksApi.list('priorityType = "inbox" && status != "dropped"').then(r => r.length),
    [], 'tasks'
  );

  const hasAnyFocusTasks = (mustTasks?.length ?? 0) + (shouldTasks?.length ?? 0) + (couldTasks?.length ?? 0) > 0;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Streak + Score row */}
      <div className="flex gap-3">
        <StreakBadge streak={streak} />
        <div className="flex-1">
          <DayScore todayDone={streak?.todayDone ?? false} />
        </div>
      </div>

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
              {(inboxCount ?? 0) > 0 && (
                <span className="bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded text-xs font-mono">{inboxCount}</span>
              )}
            </>
          )}
        </button>
      </div>

      {aiError && (
        <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl animate-slide-up">
          <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-red-400">{aiError}</p>
        </div>
      )}

      {analysisSummary && (
        <div className="card p-4 bg-zinc-800/40 border-zinc-700/60 animate-slide-up">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono text-zinc-500">✦ AI 对齐分析</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">{analysisSummary}</p>
        </div>
      )}

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

      {mustTasks && mustTasks.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-xs font-mono font-semibold text-red-400 uppercase tracking-wider">JustOne 核心大事</span>
          </div>
          <TaskCard task={mustTasks[0]} size="large" />
        </section>
      )}

      {shouldTasks && shouldTasks.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs font-mono font-semibold text-amber-400 uppercase tracking-wider">
              应该做 · {shouldTasks.length} 件中事
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
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
              顺便做 · {couldTasks.length} 件小事
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
