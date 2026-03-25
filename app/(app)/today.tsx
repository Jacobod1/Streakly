import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { eq, and, gte } from 'drizzle-orm';
import * as Haptics from 'expo-haptics';
import { db } from '../../db';
import { habits, habit_logs, categories } from '../../db/schema';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { todayStr, daysAgo, formatDate } from '../../utils/date';
import { computeStreak } from '../../utils/streak';
import * as Crypto from 'expo-crypto';
import WeatherCard from '../../components/WeatherCard';
import { SkeletonCard } from '../../components/SkeletonLoader';

type HabitRow = {
  habit: typeof habits.$inferSelect;
  category: typeof categories.$inferSelect;
  todayLog: typeof habit_logs.$inferSelect | null;
  streak: number;
};

export default function TodayScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [rows, setRows] = useState<HabitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const today = todayStr();
    const since = daysAgo(90);

    const habitsWithCats = await db
      .select({ habit: habits, category: categories })
      .from(habits)
      .innerJoin(categories, eq(habits.category_id, categories.id))
      .where(and(eq(habits.user_id, user.id), eq(habits.is_active, true)));

    const result: HabitRow[] = await Promise.all(
      habitsWithCats.map(async ({ habit, category }) => {
        const [todayLog] = await db
          .select()
          .from(habit_logs)
          .where(and(eq(habit_logs.habit_id, habit.id), eq(habit_logs.date, today)));

        const recentLogs = await db
          .select({ date: habit_logs.date, value: habit_logs.value })
          .from(habit_logs)
          .where(and(eq(habit_logs.habit_id, habit.id), gte(habit_logs.date, since)));

        return { habit, category, todayLog: todayLog ?? null, streak: computeStreak(recentLogs) };
      })
    );

    setRows(result);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function quickComplete(habitId: string, metricType: string) {
    if (!user) return;
    const today = todayStr();
    const now = new Date().toISOString();

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const [existing] = await db
      .select()
      .from(habit_logs)
      .where(and(eq(habit_logs.habit_id, habitId), eq(habit_logs.date, today)));

    if (existing) {
      // Toggle off
      await db.delete(habit_logs).where(eq(habit_logs.id, existing.id));
    } else {
      await db.insert(habit_logs).values({
        id: Crypto.randomUUID(),
        habit_id: habitId,
        user_id: user.id,
        date: today,
        value: 1,
        notes: null,
        created_at: now,
      });
    }
    load();
  }

  const today = todayStr();
  const completed = rows.filter(r => r.todayLog && r.todayLog.value > 0).length;
  const pct = rows.length > 0 ? Math.round((completed / rows.length) * 100) : 0;

  const s = styles(colors);

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={s.header}>
        <Text style={s.greeting} accessibilityRole="header">
          {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'} 👋
        </Text>
        <Text style={s.dateText}>{formatDate(today)}</Text>
      </View>

      {/* Weather */}
      <WeatherCard />

      {/* Skeleton while loading */}
      {loading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : (
        <>

      {/* Progress card */}
      <View style={s.progressCard}>
        <View style={s.progressTop}>
          <Text style={s.progressLabel}>Today's Progress</Text>
          <Text style={s.progressPct}>{pct}%</Text>
        </View>
        <View style={s.progressBg}>
          <View style={[s.progressFill, { width: `${pct}%` }]} />
        </View>
        <Text style={s.progressSub}>{completed} of {rows.length} habits completed</Text>
      </View>

      {/* Habit list */}
      {rows.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🌱</Text>
          <Text style={s.emptyTitle}>No habits yet</Text>
          <Text style={s.emptyText}>Head to the Habits tab to create your first habit.</Text>
        </View>
      ) : (
        rows.map(({ habit, category, todayLog, streak }) => {
          const done = !!todayLog && todayLog.value > 0;
          return (
            <TouchableOpacity
              key={habit.id}
              style={[s.card, done && s.cardDone]}
              onPress={() => router.push(`/log/${habit.id}`)}
              activeOpacity={0.8}
              accessibilityLabel={`${habit.name}, ${done ? 'completed' : 'not completed today'}`}
              accessibilityRole="button"
            >
              <View style={[s.categoryDot, { backgroundColor: category.colour }]} />
              <View style={s.cardBody}>
                <Text style={[s.habitName, done && s.habitNameDone]}>{habit.name}</Text>
                <Text style={s.categoryName}>{category.icon} {category.name}</Text>
                {habit.metric_type === 'count' && todayLog && (
                  <Text style={s.countText}>{todayLog.value} {habit.unit}</Text>
                )}
              </View>
              <View style={s.cardRight}>
                {streak > 0 && (
                  <View style={s.streakBadge} accessibilityLabel={`${streak} day streak`}>
                    <Text style={s.streakText}>🔥 {streak}</Text>
                  </View>
                )}
                {habit.metric_type === 'boolean' ? (
                  <TouchableOpacity
                    style={[s.checkBtn, done && s.checkBtnDone]}
                    onPress={() => quickComplete(habit.id, habit.metric_type)}
                    accessibilityLabel={done ? 'Mark incomplete' : 'Mark complete'}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: done }}
                  >
                    <Text style={[s.checkBtnText, done && s.checkBtnTextDone]}>
                      {done ? '✓' : '○'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={s.logBtn}
                    onPress={() => router.push(`/log/${habit.id}`)}
                    accessibilityLabel={`Log ${habit.name}`}
                    accessibilityRole="button"
                  >
                    <Text style={s.logBtnText}>Log</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        })
      )}
        </>
      )}
    </ScrollView>
  );
}

const styles = (colors: ReturnType<typeof import('../../context/ThemeContext').useTheme>['colors']) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32 },
    header: { marginBottom: 16 },
    greeting: { fontSize: 22, fontWeight: '800', color: colors.text },
    dateText: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
    progressCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    progressTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    progressLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
    progressPct: { fontSize: 14, fontWeight: '700', color: colors.primary },
    progressBg: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
    progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
    progressSub: { fontSize: 12, color: colors.textMuted },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardDone: { borderColor: colors.success + '60', backgroundColor: colors.success + '08' },
    categoryDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
    cardBody: { flex: 1 },
    habitName: { fontSize: 15, fontWeight: '600', color: colors.text },
    habitNameDone: { color: colors.textMuted },
    categoryName: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    countText: { fontSize: 12, color: colors.primary, marginTop: 2, fontWeight: '600' },
    cardRight: { alignItems: 'flex-end', gap: 6 },
    streakBadge: {
      backgroundColor: colors.primary + '18',
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    streakText: { fontSize: 11, fontWeight: '700', color: colors.primary },
    checkBtn: {
      width: 36, height: 36, borderRadius: 18,
      borderWidth: 2, borderColor: colors.border,
      justifyContent: 'center', alignItems: 'center',
    },
    checkBtnDone: { backgroundColor: colors.success, borderColor: colors.success },
    checkBtnText: { fontSize: 16, color: colors.textMuted },
    checkBtnTextDone: { color: '#fff' },
    logBtn: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    logBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    empty: { alignItems: 'center', marginTop: 60 },
    emptyIcon: { fontSize: 48 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 12 },
    emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 6 },
  });
