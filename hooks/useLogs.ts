import { useState, useCallback } from 'react';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db';
import { habit_logs } from '../db/schema';

export function useLogs(habitId: string | undefined) {
  const [logs, setLogs] = useState<(typeof habit_logs.$inferSelect)[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!habitId) return;
    const data = await db
      .select()
      .from(habit_logs)
      .where(eq(habit_logs.habit_id, habitId))
      .orderBy(desc(habit_logs.date));
    setLogs(data);
    setLoading(false);
  }, [habitId]);

  return { logs, loading, load };
}
