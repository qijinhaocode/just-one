/**
 * Streak calculation — reads from daily_reviews to compute:
 * - currentStreak: consecutive days with mustCompleted = true ending today/yesterday
 * - longestStreak: all-time best
 * - todayDone: whether today's must is already marked complete
 */

import { reviewsApi } from './pb';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  todayDone: boolean;
  total: number; // total must-completed days ever
}

export async function computeStreak(): Promise<StreakData> {
  const reviews = await reviewsApi.list(365); // up to a year of history
  const today = new Date().toISOString().split('T')[0];

  // Build a Set of dates where mustCompleted = true
  const doneSet = new Set<string>(
    reviews.filter(r => r.mustCompleted).map(r => r.date)
  );

  const todayDone = doneSet.has(today);
  const total = doneSet.size;

  // Compute current streak
  // Walk backwards from today; if today isn't done yet, start from yesterday
  let currentStreak = 0;
  const startDate = todayDone ? today : offsetDate(today, -1);
  let cursor = startDate;

  while (doneSet.has(cursor)) {
    currentStreak++;
    cursor = offsetDate(cursor, -1);
  }

  // Compute longest streak ever (including today)
  const allDates = [...doneSet].sort();
  let longest = 0;
  let run = 0;
  let prev = '';

  for (const d of allDates) {
    if (prev && offsetDate(prev, 1) === d) {
      run++;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = d;
  }

  return { currentStreak, longestStreak: longest, todayDone, total };
}

function offsetDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
