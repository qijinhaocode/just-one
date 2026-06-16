import { useLiveQuery } from 'dexie-react-hooks';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { db } from '../db';

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function Dashboard() {
  const reviews = useLiveQuery(
    () => db.dailyReviews.orderBy('date').reverse().limit(30).toArray(),
    []
  );

  if (!reviews) {
    return (
      <div className="flex items-center justify-center h-40 text-zinc-600 text-sm">
        加载中...
      </div>
    );
  }

  const sorted = [...reviews].sort((a, b) => a.date.localeCompare(b.date));

  // Last 7 days
  const last7 = sorted.slice(-7);
  const last30 = sorted;

  const mustRate7 = last7.length > 0
    ? Math.round((last7.filter(r => r.mustCompleted === 1).length / last7.length) * 100)
    : 0;
  const mustRate30 = last30.length > 0
    ? Math.round((last30.filter(r => r.mustCompleted === 1).length / last30.length) * 100)
    : 0;

  const avgFocus7 = last7.length > 0
    ? (last7.reduce((sum, r) => sum + r.focusScore, 0) / last7.length).toFixed(1)
    : '—';

  const focusChartData = sorted.map(r => ({
    date: formatDate(r.date),
    score: r.focusScore,
    completed: r.mustCompleted === 1,
  }));

  const mustChartData = sorted.slice(-14).map(r => ({
    date: formatDate(r.date),
    completed: r.mustCompleted,
  }));

  // ── Custom tooltip ────────────────────────────────────────────────────────
  const FocusTooltip = ({ active, payload, label }: {
    active?: boolean; payload?: Array<{ value: number }>; label?: string
  }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs">
          <p className="text-zinc-400">{label}</p>
          <p className="text-zinc-100 font-mono font-semibold">{payload[0].value} <span className="text-zinc-500">/ 10</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-zinc-100">历史看板</h2>
        <p className="text-sm text-zinc-500 mt-1">数据洞察 · AI Coach 诊断归档</p>
      </div>

      {reviews.length === 0 && (
        <div className="card p-10 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center text-3xl">📊</div>
          <div>
            <p className="text-base font-semibold text-zinc-300">暂无历史数据</p>
            <p className="text-sm text-zinc-600 mt-1.5 max-w-xs">
              完成每日复盘后，数据将在此展示。坚持 7 天，趋势图就会出现。
            </p>
          </div>
        </div>
      )}

      {reviews.length > 0 && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-5 space-y-1">
              <p className="text-xs font-mono text-zinc-500">主线完胜率 · 7天</p>
              <p className="text-3xl font-black font-mono text-zinc-100">{mustRate7}<span className="text-lg text-zinc-500">%</span></p>
              <p className="text-xs text-zinc-600">{last7.filter(r => r.mustCompleted).length}/{last7.length} 天完成</p>
            </div>
            <div className="card p-5 space-y-1">
              <p className="text-xs font-mono text-zinc-500">主线完胜率 · 30天</p>
              <p className="text-3xl font-black font-mono text-zinc-100">{mustRate30}<span className="text-lg text-zinc-500">%</span></p>
              <p className="text-xs text-zinc-600">{last30.filter(r => r.mustCompleted).length}/{last30.length} 天完成</p>
            </div>
            <div className="card p-5 space-y-1">
              <p className="text-xs font-mono text-zinc-500">平均专注度 · 7天</p>
              <p className="text-3xl font-black font-mono text-zinc-100">{avgFocus7}<span className="text-lg text-zinc-500">/10</span></p>
              <p className="text-xs text-zinc-600">过去 {last7.length} 个复盘日</p>
            </div>
          </div>

          {/* Focus trend chart */}
          {focusChartData.length > 1 && (
            <div className="card p-5 space-y-4">
              <p className="text-sm font-semibold text-zinc-300">专注力波动曲线</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={focusChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#52525b' }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: '#52525b' }} />
                  <Tooltip content={<FocusTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#a1a1aa"
                    strokeWidth={2}
                    dot={{ fill: '#a1a1aa', r: 3 }}
                    activeDot={{ r: 5, fill: '#e4e4e7' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Must-Do bar chart */}
          {mustChartData.length > 1 && (
            <div className="card p-5 space-y-4">
              <p className="text-sm font-semibold text-zinc-300">主线完胜记录 · 近 14 天</p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={mustChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#52525b' }} />
                  <YAxis domain={[0, 1]} hide />
                  <Bar dataKey="completed" radius={[3, 3, 0, 0]} maxBarSize={24}>
                    {mustChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.completed === 1 ? '#22c55e' : '#3f3f46'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* AI Diagnosis Timeline */}
          <div className="space-y-4">
            <p className="text-sm font-semibold text-zinc-300">AI Coach 诊断归档</p>
            {[...reviews].sort((a, b) => b.date.localeCompare(a.date)).map(review => (
              review.aiInsight ? (
                <div key={review.id} className="flex gap-4 group">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center pt-1">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${review.mustCompleted ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                    <div className="w-px flex-1 bg-zinc-800 mt-1" />
                  </div>
                  {/* Card */}
                  <div className="flex-1 pb-4">
                    <div className="card p-4 space-y-2 hover:border-zinc-700 transition-all">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-zinc-500">{review.date}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-md font-mono border ${review.mustCompleted
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                          : 'bg-zinc-800 text-zinc-600 border-zinc-700'}`}>
                          {review.mustCompleted ? '主线达标' : '主线未达'}
                        </span>
                        <span className="text-xs font-mono text-zinc-600">专注 {review.focusScore}/10</span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">{review.aiInsight}</p>
                    </div>
                  </div>
                </div>
              ) : null
            ))}
            {reviews.every(r => !r.aiInsight) && (
              <p className="text-sm text-zinc-600">暂无 AI 诊断记录。完成晚间复盘后将在此归档。</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
