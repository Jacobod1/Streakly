import {
  cacheDirectory,
  writeAsStringAsync,
  EncodingType,
} from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { db } from '../db';
import { habit_logs, habits, categories } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function exportCSV(userId: string): Promise<void> {
  const rows = await db
    .select({
      date: habit_logs.date,
      value: habit_logs.value,
      notes: habit_logs.notes,
      habitName: habits.name,
      unit: habits.unit,
      metricType: habits.metric_type,
      categoryName: categories.name,
    })
    .from(habit_logs)
    .innerJoin(habits, eq(habit_logs.habit_id, habits.id))
    .innerJoin(categories, eq(habits.category_id, categories.id))
    .where(eq(habit_logs.user_id, userId))
    .orderBy(desc(habit_logs.date));

  const header = 'date,habit,category,metric_type,unit,value,notes\n';
  const body = rows
    .map(r =>
      [
        r.date,
        `"${r.habitName}"`,
        `"${r.categoryName}"`,
        r.metricType,
        r.unit ?? '',
        r.value,
        `"${(r.notes ?? '').replace(/"/g, '""')}"`,
      ].join(',')
    )
    .join('\n');

  const csv = header + body;
  const path = cacheDirectory + 'streakly_export.csv';
  await writeAsStringAsync(path!, csv, { encoding: EncodingType.UTF8 });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Export Habit Data' });
  }
}
