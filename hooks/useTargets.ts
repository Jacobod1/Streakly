import { useState, useCallback } from 'react';
import { eq, and, gte, sql } from 'drizzle-orm';
import { db } from '../db';
import { targets, habits, habit_logs } from '../db/schema';
import { useAuth } from '../context/AuthContext';
import { getWeekStart, daysAgo } from '../utils/date';

export type EnrichedTarget = typeof targets.$inferSelect & {
  habitName: string;
  current: number;
  metricType: string;
};

export function useTargets() {
  const { user } = useAuth();
  const [enrichedTargets, setEnrichedTargets] = useState<EnrichedTarget[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const tgts = await db.select().from(targets).where(eq(targets.user_id, user.id));
    const weekStart = getWeekStart();
    const monthStart = daysAgo(new Date().getDate() - 1);

    const enriched = await Promise.all(
      tgts.map(async t => {
        const [h] = await db
          .select({ name: habits.name, metric_type: habits.metric_type })
          .from(habits)
          .where(eq(habits.id, t.habit_id));
        const periodStart = t.period === 'weekly' ? weekStart : monthStart;
        const periodLogs = await db
          .select({ value: habit_logs.value })
          .from(habit_logs)
          .where(
            and(
              eq(habit_logs.habit_id, t.habit_id),
              gte(habit_logs.date, periodStart),
              sql`${habit_logs.value} > 0`
            )
          );
        const current = h?.metric_type === 'count'
          ? periodLogs.reduce((s, l) => s + l.value, 0)
          : periodLogs.length;
        return { ...t, habitName: h?.name ?? '—', current, metricType: h?.metric_type ?? 'boolean' };
      })
    );

    setEnrichedTargets(enriched);
    setLoading(false);
  }, [user]);

  return { enrichedTargets, loading, load };
}
