import { todayStr, daysAgo } from './date';

export function computeStreak(logs: { date: string; value: number }[]): number {
  const completedDates = new Set(
    logs.filter(l => l.value > 0).map(l => l.date)
  );

  const today = todayStr();
  const yesterday = daysAgo(1);

  // Start from today if logged, else yesterday if logged, else no streak
  let startOffset = 0;
  if (completedDates.has(today)) {
    startOffset = 0;
  } else if (completedDates.has(yesterday)) {
    startOffset = 1;
  } else {
    return 0;
  }

  let streak = 0;
  let i = startOffset;
  while (true) {
    const d = daysAgo(i);
    if (!completedDates.has(d)) break;
    streak++;
    i++;
  }

  return streak;
}

export function computeLongestStreak(logs: { date: string; value: number }[]): number {
  const completedDates = new Set(
    logs.filter(l => l.value > 0).map(l => l.date)
  );
  const sorted = Array.from(completedDates).sort();
  if (sorted.length === 0) return 0;

  let longest = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T12:00:00');
    const curr = new Date(sorted[i] + 'T12:00:00');
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}
