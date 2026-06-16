import { usePB } from '../hooks/usePB';
import { reviewsApi, tasksApi, type DailyReview, type Task } from '../services/pb';import { useState } from 'react';

interface WeeklyReportProps {
  onClose: () => void;
}

function getThisWeekDates(): string[] {
  const dates: string[] = [];
  const today = new Date();
  // Monday of current week
  const day = today.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

function getLastWeekDates(): string[] {
  const dates: string[] = [];
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff - 7);
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

export function WeeklyReport({ onClose }: WeeklyReportProps) {
  const [visible] = useState(true);
  const thisWeek = getThisWeekDates();
  const lastWeek = getLastWeekDates();
  const weekStart = thisWeek[0];
  const weekEnd = thisWeek[6];

  const { data: reviews } = usePB<DailyReview[]>(
    () => reviewsApi.list(14),
    [], 'daily_reviews'
  );

  const { data: completedTasks } = usePB<Task[]>(    () => tasksApi.list(`status = "completed" && targetDate >= "${weekStart}" && targetDate <= "${weekEnd}"`),
    [weekStart, weekEnd], 'tasks'
  );

  const thisWeekReviews = reviews?.filter(r => thisWeek.includes(r.date)) ?? [];
  const lastWeekReviews = reviews?.filter(r => lastWeek.includes(r.date)) ?? [];

  const mustWins = thisWeekReviews.filter(r => r.mustCompleted).length;
  const mustWinsLast = lastWeekReviews.filter(r => r.mustCompleted).length;
  const reviewedDays = thisWeekReviews.length;

  const avgFocus = reviewedDays > 0
    ? (thisWeekReviews.reduce((s, r) => s + r.focusScore, 0) / reviewedDays).toFixed(1)
    : '—';
  const avgFocusLast = lastWeekReviews.length > 0
    ? (lastWeekReviews.reduce((s, r) => s + r.focusScore, 0) / lastWeekReviews.length).toFixed(1)
    : '—';

  const mustDelta = lastWeekReviews.length > 0 ? mustWins - mustWinsLast : null;
  const focusDelta = avgFocusLast !== '—' && avgFocus !== '—'
    ? (parseFloat(avgFocus) - parseFloat(avgFocusLast)).toFixed(1)
    : null;

  // Most procrastinated task type
  const staleTasks = completedTasks?.filter(t => (t.streakCount ?? 0) >= 3) ?? [];

  const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const reviewMap = new Map(reviews?.map(r => [r.date, r]) ?? []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300
          ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">每周报告</h2>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              {thisWeek[0]} → {thisWeek[4]}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-zinc-300 w-7 h-7 flex items-center justify-center rounded-md hover:bg-zinc-800 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-4 space-y-1">
              <p className="text-xs font-mono text-zinc-500">主线完胜</p>
              <p className="text-2xl font-black font-mono text-zinc-100">{mustWins}<span className="text-sm text-zinc-500 font-normal">/7</span></p>
              {mustDelta !== null && (
                <p className={`text-xs font-mono ${mustDelta > 0 ? 'text-emerald-400' : mustDelta < 0 ? 'text-red-400' : 'text-zinc-600'}`}>
                  {mustDelta > 0 ? `↑+${mustDelta}` : mustDelta < 0 ? `↓${mustDelta}` : '→ 持平'} 较上周
                </p>
              )}
            </div>
            <div className="card p-4 space-y-1">
              <p className="text-xs font-mono text-zinc-500">平均专注</p>
              <p className="text-2xl font-black font-mono text-zinc-100">{avgFocus}<span className="text-sm text-zinc-500 font-normal">/10</span></p>
              {focusDelta !== null && (
                <p className={`text-xs font-mono ${parseFloat(focusDelta) > 0 ? 'text-emerald-400' : parseFloat(focusDelta) < 0 ? 'text-red-400' : 'text-zinc-600'}`}>
                  {parseFloat(focusDelta) > 0 ? `↑+${focusDelta}` : `↓${focusDelta}`} 较上周
                </p>
              )}
            </div>
            <div className="card p-4 space-y-1">
              <p className="text-xs font-mono text-zinc-500">已复盘</p>
              <p className="text-2xl font-black font-mono text-zinc-100">{reviewedDays}<span className="text-sm text-zinc-500 font-normal">/7</span></p>
              <p className="text-xs text-zinc-600">天</p>
            </div>
          </div>

          {/* Weekly calendar heatmap */}
          <div className="space-y-2">
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">本周每日状态</p>
            <div className="grid grid-cols-7 gap-1.5">
              {thisWeek.map((date, i) => {
                const review = reviewMap.get(date);
                const isToday = date === new Date().toISOString().split('T')[0];
                const isFuture = date > new Date().toISOString().split('T')[0];
                return (
                  <div key={date} className="flex flex-col items-center gap-1">
                    <span className={`text-xs font-mono ${isToday ? 'text-zinc-300' : 'text-zinc-600'}`}>
                      {dayLabels[i]}
                    </span>
                    <div
                      className={`w-full aspect-square rounded-lg flex items-center justify-center text-sm transition-all
                        ${isFuture ? 'bg-zinc-800/30 border border-zinc-800' :
                          !review ? 'bg-zinc-800/60 border border-zinc-700/60' :
                          review.mustCompleted ? 'bg-emerald-500/20 border border-emerald-500/30' :
                          'bg-red-500/10 border border-red-500/20'}`}
                      title={date}
                    >
                      {!isFuture && (review?.mustCompleted ? '✓' : review ? '✗' : '·')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Completed tasks this week */}
          {(completedTasks?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                本周完成任务 ({completedTasks!.length})
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {completedTasks!.map(t => (
                  <div key={t.id} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-xs text-zinc-400 truncate">{t.title}</span>
                    {(t.streakCount ?? 0) >= 3 && (
                      <span className="text-xs text-amber-500 font-mono shrink-0">拖延{t.streakCount}天才完成</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Procrastination insight */}
          {staleTasks.length > 0 && (
            <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-xl space-y-1">
              <p className="text-xs font-mono text-amber-400 font-semibold">⚠ 拖延洞察</p>
              <p className="text-xs text-zinc-400">
                本周有 {staleTasks.length} 个任务拖延超过 3 天才完成。
                最长拖延：{Math.max(...staleTasks.map(t => t.streakCount ?? 0))} 天。
              </p>
            </div>
          )}

          {/* AI insight from most recent review */}
          {thisWeekReviews.length > 0 && thisWeekReviews.find(r => r.aiInsight) && (
            <div className="space-y-2">
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">本周 AI 诊断摘要</p>
              <div className="card p-4 bg-zinc-800/40">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {[...thisWeekReviews]
                    .filter(r => r.aiInsight)
                    .sort((a, b) => b.date.localeCompare(a.date))[0]?.aiInsight}
                </p>
              </div>
            </div>
          )}

          {reviewedDays === 0 && (
            <div className="text-center py-4 text-zinc-600 text-sm">
              本周还没有复盘记录。每天晚上填写复盘，下周这里会有完整数据。
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-zinc-800">
          <button onClick={onClose} className="btn-primary w-full py-2.5 text-sm">
            关闭报告
          </button>
        </div>
      </div>
    </div>
  );
}
