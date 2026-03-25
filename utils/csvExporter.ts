import { db } from '../db';
import { habits, habit_logs, categories } from '../db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { writeAsStringAsync, cacheDirectory, EncodingType } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

/**
 * Export habit logs for a user to CSV and open the share sheet.
 * @param userId  The authenticated user's ID
 * @param from    Optional ISO date string "YYYY-MM-DD" — lower bound (inclusive)
 * @param to      Optional ISO date string "YYYY-MM-DD" — upper bound (inclusive)
 */
export async function exportCSV(userId: string, from?: string, to?: string) {
  // Build conditions array
  const conditions = [eq(habit_logs.user_id, userId)];
  if (from) conditions.push(gte(habit_logs.date, from));
  if (to)   conditions.push(lte(habit_logs.date, to));

  const logs = await db
    .select({
      date: habit_logs.date,
      value: habit_logs.value,
      notes: habit_logs.notes,
      created_at: habit_logs.created_at,
      habitId: habit_logs.habit_id,
    })
    .from(habit_logs)
    .where(and(...conditions));

  // Enrich with habit + category names
  const habitCache: Record<string, { name: string; unit: string | null; metricType: string; categoryName: string }> = {};

  const rows: string[] = [
    'date,habit,category,metric_type,unit,value,notes',
  ];

  for (const log of logs) {
    if (!habitCache[log.habitId]) {
      const [h] = await db
        .select({ name: habits.name, unit: habits.unit, metric_type: habits.metric_type, category_id: habits.category_id })
        .from(habits)
        .where(eq(habits.id, log.habitId));
      if (h) {
        const [cat] = await db.select({ name: categories.name }).from(categories).where(eq(categories.id, h.category_id));
        habitCache[log.habitId] = {
          name: h.name,
          unit: h.unit,
          metricType: h.metric_type,
          categoryName: cat?.name ?? '',
        };
      }
    }
    const h = habitCache[log.habitId];
    if (!h) continue;

    const csvRow = [
      log.date,
      `"${h.name.replace(/"/g, '""')}"`,
      `"${h.categoryName.replace(/"/g, '""')}"`,
      h.metricType,
      h.unit ?? '',
      log.value,
      `"${(log.notes ?? '').replace(/"/g, '""')}"`,
    ].join(',');
    rows.push(csvRow);
  }

  const csv = rows.join('\n');
  const fileUri = `${cacheDirectory}streakly_export_${Date.now()}.csv`;
  await writeAsStringAsync(fileUri, csv, { encoding: EncodingType.UTF8 });
  await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export Habit Logs' });
}
