import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { eq, and, gte, sql } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { db } from '../../db';
import { habits, habit_logs, targets } from '../../db/schema';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { todayStr, getWeekStart, daysAgo } from '../../utils/date';

export default function LogScreen() {
  // `date` param allows pre-selecting a specific date (e.g. from log history edit)
  const { habitId, date: dateParam } = useLocalSearchParams<{ habitId: string; date?: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [habit, setHabit] = useState<typeof habits.$inferSelect | null>(null);
  // Initialise date from `date` query param if provided (edit from log history)
  const [date, setDate] = useState(() => {
    if (dateParam) {
      const d = new Date(dateParam + 'T12:00:00');
      return isNaN(d.getTime()) ? new Date() : d;
    }
    return new Date();
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [boolValue, setBoolValue] = useState(true);
  const [countValue, setCountValue] = useState('1');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [existingLog, setExistingLog] = useState<typeof habit_logs.$inferSelect | null>(null);

  useEffect(() => {
    if (!habitId || !user) return;
    (async () => {
      const [h] = await db.select().from(habits).where(eq(habits.id, habitId));
      setHabit(h ?? null);

      // Check for existing log today
      const today = todayStr();
      const [existing] = await db
        .select()
        .from(habit_logs)
        .where(and(eq(habit_logs.habit_id, habitId), eq(habit_logs.date, today)));

      if (existing) {
        setExistingLog(existing);
        if (h?.metric_type === 'boolean') {
          setBoolValue(existing.value > 0);
        } else {
          setCountValue(String(existing.value));
        }
        setNotes(existing.notes ?? '');
      }
      setLoading(false);
    })();
  }, [habitId, user]);

  async function handleSave() {
    if (!habit || !user) return;
    const dateStr = date.toISOString().split('T')[0];
    const value = habit.metric_type === 'boolean' ? (boolValue ? 1 : 0) : parseInt(countValue, 10) || 0;
    const now = new Date().toISOString();

    setSaving(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      // Check for existing log on selected date
      const [existing] = await db
        .select()
        .from(habit_logs)
        .where(and(eq(habit_logs.habit_id, habit.id), eq(habit_logs.date, dateStr)));

      if (existing) {
        await db.update(habit_logs).set({ value, notes: notes.trim() || null }).where(eq(habit_logs.id, existing.id));
      } else {
        await db.insert(habit_logs).values({
          id: Crypto.randomUUID(),
          habit_id: habit.id,
          user_id: user.id,
          date: dateStr,
          value,
          notes: notes.trim() || null,
          created_at: now,
        });
      }
      // Check if any target is now met and fire a notification
      await checkTargetMet(habit.id, habit.name, value);

      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  async function checkTargetMet(habitId: string, habitName: string, newValue: number) {
    if (newValue <= 0) return;
    const habitTargets = await db.select().from(targets).where(eq(targets.habit_id, habitId));
    for (const target of habitTargets) {
      const periodStart = target.period === 'weekly' ? getWeekStart() : daysAgo(new Date().getDate() - 1);
      const periodLogs = await db
        .select({ value: habit_logs.value })
        .from(habit_logs)
        .where(and(eq(habit_logs.habit_id, habitId), gte(habit_logs.date, periodStart), sql`${habit_logs.value} > 0`));
      const total = habit?.metric_type === 'count'
        ? periodLogs.reduce((s, l) => s + l.value, 0)
        : periodLogs.length;
      if (total >= target.target_value) {
        const { status } = await Notifications.getPermissionsAsync();
        if (status === 'granted') {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `Target met! 🎯`,
              body: `You've hit your ${target.period} target for "${habitName}"!`,
            },
            trigger: null, // immediate
          });
        }
        break; // one notification per save
      }
    }
  }

  const s = styles(colors);

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.primary} /></View>;
  if (!habit) return <View style={s.center}><Text style={{ color: colors.text }}>Habit not found.</Text></View>;

  const dateStr = date.toISOString().split('T')[0];

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {/* Habit info */}
        <Text style={s.habitName}>{habit.name}</Text>
        <Text style={s.habitMeta}>
          {habit.metric_type === 'count' ? `Count · ${habit.unit ?? 'times'}` : 'Yes / No'}
        </Text>

        {existingLog && (
          <View style={s.existingBanner}>
            <Text style={s.existingText}>✏️ Editing existing entry for today</Text>
          </View>
        )}

        {/* Date picker */}
        <Text style={s.label}>Date</Text>
        <TouchableOpacity style={s.dateBtn} onPress={() => setShowDatePicker(true)}>
          <Text style={s.dateBtnText}>{dateStr}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            onChange={(_, d) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (d) setDate(d);
            }}
          />
        )}

        {/* Value */}
        <Text style={s.label}>Value</Text>
        {habit.metric_type === 'boolean' ? (
          <View style={s.boolRow}>
            <TouchableOpacity
              style={[s.boolBtn, !boolValue && s.boolBtnActive, !boolValue && { borderColor: colors.danger }]}
              onPress={() => setBoolValue(false)}
            >
              <Text style={[s.boolBtnText, !boolValue && { color: colors.danger }]}>✗ No</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.boolBtn, boolValue && s.boolBtnActive]}
              onPress={() => setBoolValue(true)}
            >
              <Text style={[s.boolBtnText, boolValue && { color: colors.success }]}>✓ Done</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.countRow}>
            <TouchableOpacity
              style={s.countBtn}
              onPress={() => setCountValue(v => String(Math.max(0, parseInt(v || '0') - 1)))}
            >
              <Text style={s.countBtnText}>−</Text>
            </TouchableOpacity>
            <TextInput
              style={s.countInput}
              value={countValue}
              onChangeText={setCountValue}
              keyboardType="number-pad"
              textAlign="center"
            />
            <TouchableOpacity
              style={s.countBtn}
              onPress={() => setCountValue(v => String(parseInt(v || '0') + 1))}
            >
              <Text style={s.countBtnText}>+</Text>
            </TouchableOpacity>
            {habit.unit && <Text style={s.unitLabel}>{habit.unit}</Text>}
          </View>
        )}

        {/* Notes */}
        <Text style={s.label}>Notes (optional)</Text>
        <TextInput
          style={[s.input, s.multiline]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any notes about this entry..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Entry</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: ReturnType<typeof import('../../context/ThemeContext').useTheme>['colors']) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    habitName: { fontSize: 22, fontWeight: '800', color: colors.text },
    habitMeta: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: 8 },
    existingBanner: { backgroundColor: colors.primary + '18', borderRadius: 8, padding: 10, marginBottom: 8 },
    existingText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
    label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 6, marginTop: 16 },
    dateBtn: {
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    },
    dateBtnText: { fontSize: 15, color: colors.text, fontWeight: '600' },
    boolRow: { flexDirection: 'row', gap: 12 },
    boolBtn: { flex: 1, paddingVertical: 16, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
    boolBtnActive: { backgroundColor: colors.success + '18', borderColor: colors.success },
    boolBtnText: { fontSize: 16, fontWeight: '700', color: colors.textMuted },
    countRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    countBtn: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
    },
    countBtnText: { color: '#fff', fontSize: 24, fontWeight: '300' },
    countInput: {
      flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
      borderRadius: 12, paddingVertical: 12, fontSize: 22, fontWeight: '700', color: colors.text,
    },
    unitLabel: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
    input: {
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text,
    },
    multiline: { minHeight: 80, textAlignVertical: 'top' },
    saveBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
