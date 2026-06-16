/**
 * CarryOverBanner — shown in FocusBoard when there are uncompleted
 * yesterday's tasks. One click carries them all to today.
 */
import { useState, useEffect } from 'react';
import { tasksApi } from '../services/pb';

interface CarryOverBannerProps {
  onCarried: () => void;
}

export function CarryOverBanner({ onCarried }: CarryOverBannerProps) {
  const [count, setCount] = useState<number | null>(null);
  const [carrying, setCarrying] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const yesterday = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d.toISOString().split('T')[0];
    })();
    tasksApi.list(
      `status = "pending" && priorityType != "inbox" && targetDate = "${yesterday}"`
    ).then(items => setCount(items.length));
  }, []);

  if (dismissed || count === null || count === 0) return null;

  async function handleCarry() {
    setCarrying(true);
    await tasksApi.carryOverYesterday();
    setCarrying(false);
    setDismissed(true);
    onCarried();
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-zinc-800/60 border border-zinc-700/60 rounded-xl animate-slide-up">
      <span className="text-lg shrink-0">📋</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-200">
          昨天有 {count} 个任务未完成
        </p>
        <p className="text-xs text-zinc-500 mt-0.5">是否延续到今天？</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => setDismissed(true)}
          className="btn-ghost text-xs text-zinc-600"
        >
          忽略
        </button>
        <button
          onClick={handleCarry}
          disabled={carrying}
          className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
        >
          {carrying ? (
            <>
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              延续中...
            </>
          ) : (
            '一键延续 →'
          )}
        </button>
      </div>
    </div>
  );
}
