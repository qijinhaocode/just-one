import { useEffect, useState } from 'react';
import { usePB } from '../hooks/usePB';
import { tasksApi, type Task } from '../services/pb';
import type { StreakData } from '../services/streak';

// ─── Streak Badge ─────────────────────────────────────────────────────────────

interface StreakBadgeProps {
  streak: StreakData | null;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  const [pop, setPop] = useState(false);

  // Trigger pop animation when streak increments
  useEffect(() => {
    if (streak && streak.currentStreak > 0) {
      setPop(true);
      const t = setTimeout(() => setPop(false), 600);
      return () => clearTimeout(t);
    }
  }, [streak?.currentStreak]);

  if (!streak) return null;

  const { currentStreak, longestStreak, todayDone } = streak;

  const flameColor =
    currentStreak >= 30 ? 'text-red-400' :
    currentStreak >= 14 ? 'text-orange-400' :
    currentStreak >= 7  ? 'text-amber-400' :
    currentStreak >= 3  ? 'text-yellow-400' :
    'text-zinc-500';

  const bgColor =
    currentStreak >= 7  ? 'bg-amber-500/10 border-amber-500/20' :
    currentStreak >= 3  ? 'bg-yellow-500/10 border-yellow-500/15' :
    'bg-zinc-800/60 border-zinc-700/60';

  return (
    <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border ${bgColor} transition-all duration-300`}>
      {/* Flame */}
      <span
        className={`text-xl leading-none transition-transform duration-300 ${pop ? 'scale-125' : 'scale-100'} ${currentStreak === 0 ? 'grayscale opacity-30' : ''}`}
        title={currentStreak === 0 ? '今日完成 Must 任务可点燃火焰' : `连胜 ${currentStreak} 天`}
      >
        🔥
      </span>

      <div>
        <div className="flex items-baseline gap-1">
          <span className={`text-xl font-black font-mono leading-none ${flameColor}`}>
            {currentStreak}
          </span>
          <span className="text-xs text-zinc-500">天连胜</span>
        </div>
        {longestStreak > 0 && (
          <p className="text-xs text-zinc-600 font-mono mt-0.5">
            最佳 {longestStreak}天 {todayDone && currentStreak === longestStreak ? '🏆' : ''}
          </p>
        )}
      </div>

      {/* Milestone rings */}
      {currentStreak > 0 && (
        <div className="flex gap-1 ml-1">
          {[3, 7, 14, 30].map(milestone => (
            <div
              key={milestone}
              title={`${milestone}天里程碑`}
              className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] font-mono font-bold transition-all
                ${currentStreak >= milestone
                  ? 'bg-amber-400/20 border-amber-400/40 text-amber-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-600'}`}
            >
              {milestone >= 30 ? '∞' : milestone}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Day Score ────────────────────────────────────────────────────────────────

interface DayScoreProps {
  todayDone: boolean;
}

export function DayScore({ todayDone }: DayScoreProps) {
  const today = new Date().toISOString().split('T')[0];

  const { data: mustTasks } = usePB<Task[]>(
    () => tasksApi.list(`priorityType = "must" && (targetDate = "${today}" || targetDate = "")`),
    [today], 'tasks'
  );
  const { data: shouldTasks } = usePB<Task[]>(
    () => tasksApi.list(`priorityType = "should" && (targetDate = "${today}" || targetDate = "")`),
    [today], 'tasks'
  );
  const { data: couldTasks } = usePB<Task[]>(
    () => tasksApi.list(`priorityType = "could" && (targetDate = "${today}" || targetDate = "")`),
    [today], 'tasks'
  );

  const mustDone   = mustTasks?.filter(t => t.status === 'completed').length ?? 0;
  const shouldDone = shouldTasks?.filter(t => t.status === 'completed').length ?? 0;
  const couldDone  = couldTasks?.filter(t => t.status === 'completed').length ?? 0;

  const mustTotal   = mustTasks?.length ?? 0;
  const shouldTotal = shouldTasks?.length ?? 0;
  const couldTotal  = couldTasks?.length ?? 0;

  // Scoring: Must=50, each Should=10 (max 30), each Could=4 (max 20)
  const mustScore   = todayDone && mustTotal > 0 ? 50 : 0;
  const shouldScore = Math.min(shouldDone * 10, 30);
  const couldScore  = Math.min(couldDone * 4, 20);
  const total       = mustScore + shouldScore + couldScore;
  const maxTotal    = (mustTotal > 0 ? 50 : 0) + Math.min(shouldTotal * 10, 30) + Math.min(couldTotal * 4, 20);

  const pct = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;

  const grade =
    pct >= 90 ? { label: 'S', color: 'text-amber-300', bg: 'bg-amber-400/20' } :
    pct >= 70 ? { label: 'A', color: 'text-emerald-400', bg: 'bg-emerald-400/20' } :
    pct >= 50 ? { label: 'B', color: 'text-blue-400', bg: 'bg-blue-400/20' } :
    pct >= 30 ? { label: 'C', color: 'text-zinc-300', bg: 'bg-zinc-700/40' } :
    { label: '—', color: 'text-zinc-600', bg: 'bg-zinc-800/40' };

  if (mustTotal + shouldTotal + couldTotal === 0) return null;

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-zinc-800/40 border border-zinc-700/60">
      {/* Grade circle */}
      <div className={`w-9 h-9 rounded-full ${grade.bg} flex items-center justify-center shrink-0`}>
        <span className={`text-base font-black font-mono ${grade.color}`}>{grade.label}</span>
      </div>

      <div className="flex-1 min-w-0">
        {/* Score bar */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-zinc-500 font-mono">今日战报</span>
          <span className="text-xs font-mono font-bold text-zinc-200">{total}<span className="text-zinc-600 font-normal">/{maxTotal || 100}</span></span>
        </div>
        <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-zinc-400 to-zinc-200"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Breakdown */}
        <div className="flex items-center gap-3 mt-1.5">
          {mustTotal > 0 && (
            <span className={`text-xs font-mono ${mustDone > 0 ? 'text-red-400' : 'text-zinc-600'}`}>
              {mustDone > 0 ? '✓' : '○'} Must +{mustScore}
            </span>
          )}
          {shouldTotal > 0 && (
            <span className={`text-xs font-mono ${shouldDone > 0 ? 'text-amber-400' : 'text-zinc-600'}`}>
              {shouldDone}/{shouldTotal} Should +{shouldScore}
            </span>
          )}
          {couldTotal > 0 && (
            <span className={`text-xs font-mono ${couldDone > 0 ? 'text-emerald-400' : 'text-zinc-600'}`}>
              {couldDone}/{couldTotal} Could +{couldScore}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
