import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Dimensions,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { db } from '../../db';
import { habits, habit_logs, categories, targets } from '../../db/schema';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  last7Days, last30Days, daysAgo, shortDay,
  getWeekStart, last6WeekRanges, last6MonthRanges,
} from '../../utils/date';
import { computeStreak, computeLongestStreak } from '../../utils/streak';
import TargetProgress from '../../components/TargetProgress';

const SCREEN_W = Dimensions.get('window').width;
type ViewMode = 'daily' | 'weekly' | 'monthly';

type HabitOption = { id: string; name: string; colour: string };
type HabitStreak = { id: string; name: string; colour: string; current: number; longest: number };
type BarItem = { value: number; label: string; frontColor: string };
type DonutItem = { value: number; color: string; text?: string };
type LineItem = { value: number };
type TargetRow = { habitName: string; period: 'weekly' | 'monthly'; target_value: number; current: number };

export default function InsightsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();

  const [view, setView] = useState<ViewMode>('daily');
  const [selectedHabitId, setSelectedHabitId] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [totalThisWeek, setTotalThisWeek] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [mostActiveCat, setMostActiveCat] = useState('—');
  const [barData, setBarData] = useState<BarItem[]>([]);
  const [donutData, setDonutData] = useState<DonutItem[]>([]);
  const [lineData, setLineData] = useState<LineItem[]>([]);
  const [habitOptions, setHabitOptions] = useState<HabitOption[]>([]);
  const [habitStreaks, setHabitStreaks] = useState<HabitStreak[]>([]);
  const [targetRows, setTargetRows] = useState<TargetRow[]>([]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const countLogs = async (start: string, end: string) => {
    const [res] = await db
      .select({ n: sql<number>`count(*)` })
      .from(habit_logs)
      .where(and(
        eq(habit_logs.user_id, user!.id),
        gte(habit_logs.date, start),
        lte(habit_logs.date, end),
        sql`${habit_logs.value} > 0`,
      ));
    return Number(res?.n ?? 0);
  };

  // ── Load bar chart based on view ──────────────────────────────────────────
  const loadBar = useCallback(async (v: ViewMode) => {
    if (!user) return;

    let items: BarItem[] = [];

    if (v === 'daily') {
      const days = last7Days();
      items = await Promise.all(days.map(async date => ({
        value: await countLogs(date, date),
        label: shortDay(date),
        frontColor: date === days[6] ? colors.primary : colors.primary + 'AA',
      })));
    } else if (v === 'weekly') {
      const ranges = last6WeekRanges();
      items = await Promise.all(ranges.map(async ({ start, end, label }, i) => ({
        value: await countLogs(start, end),
        label,
        frontColor: i === ranges.length - 1 ? colors.primary : colors.primary + 'AA',
      })));
    } else {
      const ranges = last6MonthRanges();
      items = await Promise.all(ranges.map(async ({ start, end, label }, i) => ({
        value: await countLogs(start, end),
        label,
        frontColor: i === ranges.length - 1 ? colors.primary : colors.primary + 'AA',
      })));
    }

    setBarData(items);
  }, [user, colors.primary]);

  // ── Full load ─────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user) return;

    const weekStart = getWeekStart();
    const since90 = daysAgo(89);
    const since30 = daysAgo(29);

    const [activeHabits, allTargets] = await Promise.all([
      db.select({ habit: habits, category: categories })
        .from(habits)
        .innerJoin(categories, eq(habits.category_id, categories.id))
        .where(and(eq(habits.user_id, user.id), eq(habits.is_active, true))),
      db.select().from(targets).where(eq(targets.user_id, user.id)),
    ]);

    // All logs since 90 days (single query)
    const allLogs = await db
      .select({
        habit_id: habit_logs.habit_id,
        date: habit_logs.date,
        value: habit_logs.value,
      })
      .from(habit_logs)
      .where(and(eq(habit_logs.user_id, user.id), gte(habit_logs.date, since90)));

    const logsBy = (habitId: string) => allLogs.filter(l => l.habit_id === habitId);

    // ── Summary stats ────────────────────────────────────────────────────
    const weekLogs = allLogs.filter(l => l.date >= weekStart && l.value > 0);
    setTotalThisWeek(weekLogs.length);

    const streaks = activeHabits.map(({ habit }) => computeStreak(logsBy(habit.id)));
    setBestStreak(Math.max(0, ...streaks));

    // Most active category this week
    const catCount: Record<string, { name: string; icon: string; count: number }> = {};
    for (const { habit, category } of activeHabits) {
      const wc = weekLogs.filter(l => l.habit_id === habit.id).length;
      if (!catCount[category.id]) catCount[category.id] = { name: category.name, icon: category.icon, count: 0 };
      catCount[category.id].count += wc;
    }
    const topCat = Object.values(catCount).sort((a, b) => b.count - a.count)[0];
    setMostActiveCat(topCat ? `${topCat.icon} ${topCat.name}` : '—');

    // ── Donut chart: category breakdown this week ────────────────────────
    const donut: DonutItem[] = Object.entries(catCount)
      .filter(([, v]) => v.count > 0)
      .map(([catId, v]) => {
        const cat = activeHabits.find(h => h.category.id === catId)?.category;
        return { value: v.count, color: cat?.colour ?? '#6366f1', text: v.name };
      });
    setDonutData(donut.length > 0 ? donut : [{ value: 1, color: colors.border, text: 'No data' }]);

    // ── Per-habit streaks ────────────────────────────────────────────────
    const streakRows: HabitStreak[] = activeHabits.map(({ habit, category }) => ({
      id: habit.id,
      name: habit.name,
      colour: category.colour,
      current: computeStreak(logsBy(habit.id)),
      longest: computeLongestStreak(logsBy(habit.id)),
    }));
    setHabitStreaks(streakRows.sort((a, b) => b.current - a.current));

    // ── Habit options for line chart selector ────────────────────────────
    const opts: HabitOption[] = activeHabits.map(({ habit, category }) => ({
      id: habit.id, name: habit.name, colour: category.colour,
    }));
    setHabitOptions(opts);
    if (!selectedHabitId && opts.length > 0) setSelectedHabitId(opts[0].id);

    // ── Line chart for current selection ────────────────────────────────
    const selectedId = selectedHabitId || opts[0]?.id;
    if (selectedId) {
      const habitLogs30 = allLogs.filter(l => l.habit_id === selectedId && l.date >= since30);
      const line: LineItem[] = last30Days().map(date => {
        const log = habitLogs30.find(l => l.date === date);
        return { value: log ? log.value : 0 };
      });
      setLineData(line);
    }

    // ── Targets progress ─────────────────────────────────────────────────
    const tRows: TargetRow[] = await Promise.all(
      allTargets.map(async t => {
        const hRow = activeHabits.find(h => h.habit.id === t.habit_id);
        const habitName = hRow?.habit.name ?? '—';
        const periodStart = t.period === 'weekly' ? weekStart : daysAgo(new Date().getDate() - 1);
        const periodLogs = allLogs.filter(l => l.habit_id === t.habit_id && l.date >= periodStart && l.value > 0);
        const current = hRow?.habit.metric_type === 'count'
          ? periodLogs.reduce((s, l) => s + l.value, 0)
          : periodLogs.length;
        return { habitName, period: t.period, target_value: t.target_value, current };
      })
    );
    setTargetRows(tRows);

    await loadBar(view);
    setLoading(false);
  }, [user, selectedHabitId, view]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Re-load line chart when habit selection changes
  const handleHabitSelect = useCallback(async (id: string) => {
    setSelectedHabitId(id);
    if (!user) return;
    const since30 = daysAgo(29);
    const logs = await db
      .select({ date: habit_logs.date, value: habit_logs.value })
      .from(habit_logs)
      .where(and(eq(habit_logs.habit_id, id), gte(habit_logs.date, since30)));
    const line: LineItem[] = last30Days().map(date => {
      const log = logs.find(l => l.date === date);
      return { value: log ? log.value : 0 };
    });
    setLineData(line);
  }, [user]);

  // Re-load bar chart when view changes
  const handleViewChange = useCallback((v: ViewMode) => {
    setView(v);
    loadBar(v);
  }, [loadBar]);

  const s = styles(colors);
  const barW = Math.max(24, Math.floor((SCREEN_W - 80) / (barData.length || 7)));

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.primary} /></View>;

  const selectedHabit = habitOptions.find(h => h.id === selectedHabitId);
  const donutTotal = donutData.reduce((s, d) => s + d.value, 0);

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <Text style={s.title}>Insights</Text>

      {/* ── Summary stats ── */}
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statValue}>{totalThisWeek}</Text>
          <Text style={s.statLabel}>Logs this week</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statValue}>🔥 {bestStreak}</Text>
          <Text style={s.statLabel}>Best streak</Text>
        </View>
        <View style={[s.statCard, { flex: 1.4 }]}>
          <Text style={s.statValue} numberOfLines={1}>{mostActiveCat}</Text>
          <Text style={s.statLabel}>Most active</Text>
        </View>
      </View>

      {/* ── View switcher ── */}
      <View style={s.switcher}>
        {(['daily', 'weekly', 'monthly'] as ViewMode[]).map(v => (
          <TouchableOpacity
            key={v}
            style={[s.switchBtn, view === v && s.switchBtnActive]}
            onPress={() => handleViewChange(v)}
          >
            <Text style={[s.switchText, view === v && s.switchTextActive]}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Bar chart ── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>
          {view === 'daily' ? 'Completions · Last 7 Days'
           : view === 'weekly' ? 'Completions · Last 6 Weeks'
           : 'Completions · Last 6 Months'}
        </Text>
        <View style={s.chartCard}>
          {barData.every(d => d.value === 0) ? (
            <Text style={s.noData}>No completions in this period.</Text>
          ) : (
            <BarChart
              data={barData}
              barWidth={barW}
              barBorderRadius={5}
              yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10 }}
              noOfSections={4}
              isAnimated
              hideRules={false}
              rulesColor={colors.border}
              yAxisColor={colors.border}
              xAxisColor={colors.border}
              backgroundColor={colors.card}
            />
          )}
        </View>
      </View>

      {/* ── Donut chart: category breakdown ── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Category Breakdown · This Week</Text>
        <View style={s.chartCard}>
          {donutTotal === 0 || (donutData.length === 1 && donutData[0].text === 'No data') ? (
            <Text style={s.noData}>No data for this week.</Text>
          ) : (
            <View style={s.donutWrap}>
              <PieChart
                donut
                innerRadius={55}
                radius={85}
                data={donutData}
                centerLabelComponent={() => (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{donutTotal}</Text>
                    <Text style={{ fontSize: 10, color: colors.textMuted }}>logs</Text>
                  </View>
                )}
              />
              <View style={s.legend}>
                {donutData.map((d, i) => (
                  <View key={i} style={s.legendRow}>
                    <View style={[s.legendDot, { backgroundColor: d.color }]} />
                    <Text style={s.legendText}>{d.text}</Text>
                    <Text style={s.legendVal}>{d.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>

      {/* ── Line chart: selected habit ── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Habit Trend · Last 30 Days</Text>
        {/* Habit selector */}
        {habitOptions.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.habitScroll} contentContainerStyle={s.habitScrollContent}>
            {habitOptions.map(h => (
              <TouchableOpacity
                key={h.id}
                style={[
                  s.habitChip,
                  selectedHabitId === h.id && { borderColor: h.colour, backgroundColor: h.colour + '20' },
                ]}
                onPress={() => handleHabitSelect(h.id)}
              >
                <View style={[s.habitDot, { backgroundColor: h.colour }]} />
                <Text style={[s.habitChipText, selectedHabitId === h.id && { color: h.colour }]}>
                  {h.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        <View style={s.chartCard}>
          {lineData.every(d => d.value === 0) ? (
            <Text style={s.noData}>No data for this habit.</Text>
          ) : (
            <LineChart
              data={lineData}
              color={selectedHabit?.colour ?? colors.primary}
              thickness={2}
              curved
              areaChart
              startFillColor={selectedHabit?.colour ?? colors.primary}
              startOpacity={0.25}
              endFillColor={selectedHabit?.colour ?? colors.primary}
              endOpacity={0.01}
              hideDataPoints={lineData.length > 15}
              yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 9 }}
              noOfSections={4}
              isAnimated
              rulesColor={colors.border}
              yAxisColor={colors.border}
              xAxisColor={colors.border}
              backgroundColor={colors.card}
              dataPointsColor={selectedHabit?.colour ?? colors.primary}
            />
          )}
        </View>
      </View>

      {/* ── Targets progress ── */}
      {targetRows.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Targets Progress</Text>
          {targetRows.map((t, i) => (
            <TargetProgress key={i} {...t} />
          ))}
        </View>
      )}

      {/* ── Streak counters ── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Streaks</Text>
        {habitStreaks.length === 0 ? (
          <Text style={s.noData}>No habits to show.</Text>
        ) : (
          habitStreaks.map(h => (
            <View key={h.id} style={s.streakRow}>
              <View style={[s.streakDot, { backgroundColor: h.colour }]} />
              <Text style={s.streakName}>{h.name}</Text>
              <View style={s.streakBadges}>
                <View style={[s.badge, { backgroundColor: (h.current > 0 ? h.colour : colors.border) + '25' }]}>
                  <Text style={[s.badgeText, { color: h.current > 0 ? h.colour : colors.textMuted }]}>
                    🔥 {h.current} current
                  </Text>
                </View>
                <View style={[s.badge, { backgroundColor: colors.inputBg }]}>
                  <Text style={[s.badgeText, { color: colors.textMuted }]}>
                    ⭐ {h.longest} best
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = (colors: ReturnType<typeof import('../../context/ThemeContext').useTheme>['colors']) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    title: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 16 },
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    statCard: {
      flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 12,
      borderWidth: 1, borderColor: colors.border, gap: 4,
    },
    statValue: { fontSize: 18, fontWeight: '800', color: colors.primary },
    statLabel: { fontSize: 11, color: colors.textMuted },
    switcher: {
      flexDirection: 'row', backgroundColor: colors.card, borderRadius: 12,
      borderWidth: 1, borderColor: colors.border, padding: 4, marginBottom: 20, gap: 4,
    },
    switchBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
    switchBtnActive: { backgroundColor: colors.primary },
    switchText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
    switchTextActive: { color: '#fff' },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 },
    chartCard: {
      backgroundColor: colors.card, borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
    },
    noData: { color: colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 24 },
    donutWrap: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    legend: { flex: 1, gap: 8 },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { flex: 1, fontSize: 12, color: colors.text },
    legendVal: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
    habitScroll: { marginBottom: 10 },
    habitScrollContent: { gap: 8, paddingRight: 8 },
    habitChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 12, paddingVertical: 8,
      borderRadius: 10, borderWidth: 1.5, borderColor: colors.border,
    },
    habitDot: { width: 8, height: 8, borderRadius: 4 },
    habitChipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
    streakRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.card, borderRadius: 12, padding: 12,
      marginBottom: 8, borderWidth: 1, borderColor: colors.border, gap: 10,
    },
    streakDot: { width: 10, height: 10, borderRadius: 5 },
    streakName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
    streakBadges: { flexDirection: 'row', gap: 6 },
    badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    badgeText: { fontSize: 11, fontWeight: '700' },
  });
