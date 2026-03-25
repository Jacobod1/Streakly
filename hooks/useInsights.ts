import { useState, useCallback } from 'react';
import { eq, and, gte } from 'drizzle-orm';
import { db } from '../db';
import { habits, habit_logs, categories } from '../db/schema';
import { useAuth } from '../context/AuthContext';
import { daysAgo, getWeekStart } from '../utils/date';
import { computeStreak, computeLongestStreak } from '../utils/streak';

export type InsightRow = {
  habit: typeof habits.$inferSelect;
  category: typeof categories.$inferSelect;
  logs: (typeof habit_logs.$inferSelect)[];
  currentStreak: number;
  longestStreak: number;
};

export function useInsights() {
  const { user } = useAuth();
  const [rows, setRows] = useState<InsightRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const since = daysAgo(90);
    const habitsWithCats = await db
      .select({ habit: habits, category: categories })
      .from(habits)
      .innerJoin(categories, eq(habits.category_id, categories.id))
      .where(eq(habits.user_id, user.id));

    const result = await Promise.all(
      habitsWithCats.map(async ({ habit, category }) => {
        const logs = await db
          .select()
          .from(habit_logs)
          .where(and(eq(habit_logs.habit_id, habit.id), gte(habit_logs.date, since)));
        return {
          habit,
          category,
          logs,
          currentStreak: computeStreak(logs),
          longestStreak: computeLongestStreak(logs),
        };
      })
    );

    setRows(result);
    setLoading(false);
  }, [user]);

  return { rows, loading, load };
}
