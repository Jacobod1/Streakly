import { useState, useCallback } from 'react';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { habits, categories } from '../db/schema';
import { useAuth } from '../context/AuthContext';

export type HabitWithCategory = {
  habit: typeof habits.$inferSelect;
  category: typeof categories.$inferSelect;
};

export function useHabits() {
  const { user } = useAuth();
  const [rows, setRows] = useState<HabitWithCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const data = await db
      .select({ habit: habits, category: categories })
      .from(habits)
      .innerJoin(categories, eq(habits.category_id, categories.id))
      .where(eq(habits.user_id, user.id));
    setRows(data);
    setLoading(false);
  }, [user]);

  return { rows, loading, load };
}
