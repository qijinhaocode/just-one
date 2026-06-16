import { useState, useEffect } from 'react';
import { usePB } from '../hooks/usePB';
import { tasksApi, type Task } from '../services/pb';
import type { StreakData } from '../services/streak';

interface MorningRitualProps {
  streak: StreakData | null;
  onDismiss: () => void;
}

export function MorningRitual({ streak, onDismiss }: MorningRitualProps) {
  const today = new Date().toISOString().split('T')[0];
  const [visible, setVisible] = useState(false);

  // Animate in
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const { data: mustTask } = usePB<Task | null>(
    () => tasksApi.list(`priorityType = "must" && status != "dropped" && (targetDate = "${today}" || targetDate = "")`).then(r => r[0] ?? null),
    [today], 'tasks'
  );

  const hour = new Date().getHours();
  const greeting =
    hour < 9  ? '早安' :
    hour < 12 ? '上午好' :
    hour < 14 ? '午好' :
    '下午好';

  function dismiss() {
    setVisible(false);
    setTimeout(onDismiss, 300);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={dismiss}
      />
      <div
        className={`relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-8 flex flex-col items-center text-center gap-5 transition-all duration-300
          ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      >
        {/* Greeting */}
        <div>
          <p className="text-zinc-500 text-sm font-mono">
            {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
          <h2 className="text-2xl font-bold text-zinc-100 mt-1">{greeting} 👋</h2>
        </div>

        {/* Streak */}
        {streak && streak.currentStreak > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <span className="text-2xl">🔥</span>
            <div className="text-left">
              <p className="text-sm font-bold text-amber-300">{streak.currentStreak} 天连胜</p>
              <p className="text-xs text-amber-600">不要断掉它</p>
            </div>
          </div>
        )}

        {streak && streak.currentStreak === 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800/60 border border-zinc-700 rounded-xl">
            <span className="text-2xl grayscale opacity-50">🔥</span>
            <div className="text-left">
              <p className="text-sm font-bold text-zinc-400">点燃今天的火焰</p>
              <p className="text-xs text-zinc-600">完成今日 Must 任务即可开始连胜</p>
            </div>
          </div>
        )}

        {/* Today's must task */}
        <div className="w-full">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">今日唯一大事</p>
          {mustTask ? (
            <div className="card p-4 border-red-500/25 bg-red-500/5">
              <p className="text-base font-semibold text-zinc-100 leading-snug">{mustTask.title}</p>
              {mustTask.status === 'completed' && (
                <p className="text-xs text-emerald-400 mt-1.5 font-medium">✓ 已完成，今天真棒！</p>
              )}
            </div>
          ) : (
            <div className="card p-4 border-dashed text-zinc-600 text-sm">
              还没有设定今日大事
              <p className="text-xs mt-1">去收集箱添加任务，或点击「AI 对齐分析」</p>
            </div>
          )}
        </div>

        {/* Motivational line */}
        <p className="text-xs text-zinc-600 italic">
          {getMotivation(streak?.currentStreak ?? 0)}
        </p>

        <button onClick={dismiss} className="btn-primary w-full py-2.5 text-sm">
          开始今天 →
        </button>
      </div>
    </div>
  );
}

function getMotivation(streak: number): string {
  if (streak >= 30) return '你已经连续一个月专注了，这不是习惯，这是你的本能。';
  if (streak >= 14) return '两周不间断，你的大脑正在重塑自己的运作模式。';
  if (streak >= 7)  return '一周连胜。你正在证明这不是偶然。';
  if (streak >= 3)  return '三天是习惯的开始。继续。';
  if (streak >= 1)  return '昨天做到了。今天同样可以。';
  return '今天是新的开始。一件事做好就够了。';
}
