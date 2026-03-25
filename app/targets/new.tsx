import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { eq } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';
import { db } from '../../db';
import { targets, habits } from '../../db/schema';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function NewTargetScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [habitId, setHabitId] = useState('');
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [targetValue, setTargetValue] = useState('5');
  const [userHabits, setUserHabits] = useState<(typeof habits.$inferSelect)[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      db.select().from(habits).where(eq(habits.user_id, user.id)).then(hs => {
        setUserHabits(hs);
        if (hs.length > 0) setHabitId(hs[0].id);
      });
    }
  }, [user]);

  async function handleSave() {
    if (!habitId) { Alert.alert('Select a habit'); return; }
    const val = parseInt(targetValue, 10);
    if (!val || val <= 0) { Alert.alert('Enter a valid target value'); return; }
    setSaving(true);
    try {
      await db.insert(targets).values({
        id: Crypto.randomUUID(),
        habit_id: habitId,
        user_id: user!.id,
        period,
        target_value: val,
        category_id: null,
        created_at: new Date().toISOString(),
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  const s = styles(colors);

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.label}>Habit *</Text>
        {userHabits.length === 0 ? (
          <Text style={s.noItems}>No habits yet — create a habit first.</Text>
        ) : (
          <View style={s.list}>
            {userHabits.map(h => (
              <TouchableOpacity
                key={h.id}
                style={[s.listItem, habitId === h.id && s.listItemActive]}
                onPress={() => setHabitId(h.id)}
              >
                <Text style={[s.listItemText, habitId === h.id && s.listItemTextActive]}>{h.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={s.label}>Period *</Text>
        <View style={s.segmented}>
          {(['weekly', 'monthly'] as const).map(p => (
            <TouchableOpacity
              key={p}
              style={[s.segment, period === p && s.segmentActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[s.segmentText, period === p && s.segmentTextActive]}>
                {p === 'weekly' ? '📅 Weekly' : '🗓️ Monthly'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>Target Value *</Text>
        <View style={s.countRow}>
          <TouchableOpacity style={s.countBtn} onPress={() => setTargetValue(v => String(Math.max(1, parseInt(v||'1') - 1)))}>
            <Text style={s.countBtnText}>−</Text>
          </TouchableOpacity>
          <TextInput style={s.countInput} value={targetValue} onChangeText={setTargetValue} keyboardType="number-pad" textAlign="center" />
          <TouchableOpacity style={s.countBtn} onPress={() => setTargetValue(v => String(parseInt(v||'0') + 1))}>
            <Text style={s.countBtnText}>+</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.hint}>
          {period === 'weekly' ? 'per week' : 'per month'}
        </Text>

        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Create Target</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: ReturnType<typeof import('../../context/ThemeContext').useTheme>['colors']) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8, marginTop: 16 },
    noItems: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
    list: { gap: 6 },
    listItem: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border },
    listItemActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
    listItemText: { fontSize: 14, fontWeight: '600', color: colors.text },
    listItemTextActive: { color: colors.primary },
    segmented: { flexDirection: 'row', gap: 10 },
    segment: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
    segmentActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
    segmentText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
    segmentTextActive: { color: colors.primary },
    countRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    countBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
    countBtnText: { color: '#fff', fontSize: 24, fontWeight: '300' },
    countInput: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, fontSize: 22, fontWeight: '700', color: colors.text },
    hint: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
    saveBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 28 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
