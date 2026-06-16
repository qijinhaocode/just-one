import { useState } from 'react';
import { usePB } from '../hooks/usePB';
import { tasksApi, reviewsApi, type Task, type DailyReview, type DailyReviewPayload } from '../services/pb';

interface EveningReviewProps {
  onGenerateInsight: (review: DailyReviewPayload) => Promise<string>;
}

export function EveningReview({ onGenerateInsight }: EveningReviewProps) {
  const today = new Date().toISOString().split('T')[0];

  const { data: todayReview, refetch: refetchReview } = usePB<DailyReview | null>(
    () => reviewsApi.getByDate(today),
    [today], 'daily_reviews'
  );

  const { data: mustTask } = usePB<Task | null>(
    () => tasksApi.list(`priorityType = "must" && status != "dropped" && (targetDate = "${today}" || targetDate = "")`).then(r => r[0] ?? null),
    [today], 'tasks'
  );

  const [focusScore, setFocusScore] = useState(7);
  const [q1, setQ1] = useState('');
  const [q2, setQ2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mustCompleted = mustTask?.status === 'completed';

  async function handleSubmit() {
    if (!q1.trim() || !q2.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const reviewData: DailyReviewPayload = {
        date: today,
        mustCompleted,
        reflectionQ1: q1.trim(),
        reflectionQ2: q2.trim(),
        focusScore,
        aiInsight: '',
      };
      const aiInsight = await onGenerateInsight(reviewData);
      await reviewsApi.upsert({ ...reviewData, aiInsight });
      setQ1('');
      setQ2('');
      refetchReview();
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-zinc-100">今日复盘</h2>
        <p className="text-sm text-zinc-500 mt-1">结束一天，诚实地审视自己的执行状态。</p>
      </div>

      <div className={`card p-4 flex items-center gap-4 ${mustCompleted ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/20'}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${mustCompleted ? 'bg-emerald-500/20' : 'bg-red-500/10'}`}>
          {mustCompleted ? '✅' : '❌'}
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-200">今日核心大事</p>
          <p className={`text-xs mt-0.5 font-medium ${mustCompleted ? 'text-emerald-400' : 'text-red-400'}`}>
            {mustCompleted ? '已完成 — 主线全胜！' : mustTask ? `「${mustTask.title}」未完成` : '今日未设定 Must-Do'}
          </p>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-zinc-300">今日专注度评分</label>
          <span className="text-2xl font-black font-mono text-zinc-100">
            {focusScore}<span className="text-sm font-normal text-zinc-500">/10</span>
          </span>
        </div>
        <input
          type="range" min={1} max={10} value={focusScore}
          onChange={e => setFocusScore(Number(e.target.value))}
          className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-zinc-400"
        />
        <div className="flex justify-between text-xs text-zinc-600 font-mono">
          <span>1 走神</span><span>5 一般</span><span>10 心流</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-300 block">今天完成了什么？</label>
        <textarea className="input-field resize-none" rows={3}
          placeholder="无论大小，都值得被记录下来…"
          value={q1} onChange={e => setQ1(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-300 block">遇到了什么阻碍？</label>
        <textarea className="input-field resize-none" rows={3}
          placeholder="外部干扰？内部阻力？时间分配问题？"
          value={q2} onChange={e => setQ2(e.target.value)} />
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">{error}</div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || !q1.trim() || !q2.trim()}
        className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            AI Coach 诊断中...
          </>
        ) : (
          <><span>✦</span> 生成 AI 深度洞察</>
        )}
      </button>

      {todayReview?.aiInsight && (
        <div className="card p-5 bg-zinc-800/40 border-zinc-700/60 space-y-3 animate-slide-up">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-500">✦ AI Coach 每日诊断</span>
            <span className="text-xs font-mono text-zinc-700">· {today}</span>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{todayReview.aiInsight}</p>
        </div>
      )}
    </div>
  );
}
