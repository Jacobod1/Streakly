import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { eq, desc } from 'drizzle-orm';
import { db } from '../../db';
import { habits, categories, habit_logs } from '../../db/schema';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { formatDate } from '../../utils/date';
import FilterBar from '../../components/FilterBar';

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [habit, setHabit] = useState<typeof habits.$inferSelect | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [userCategories, setUserCategories] = useState<(typeof categories.$inferSelect)[]>([]);
  const [allLogs, setAllLogs] = useState<(typeof habit_logs.$inferSelect)[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Log filter state
  const [logSearch, setLogSearch] = useState('');
  const [logDateFrom, setLogDateFrom] = useState('');
  const [logDateTo, setLogDateTo] = useState('');

  const load = useCallback(async () => {
    if (!user || !id) return;
    const [h] = await db.select().from(habits).where(eq(habits.id, id));
    if (!h) { router.back(); return; }
    setHabit(h);
    setName(h.name);
    setDescription(h.description ?? '');
    setUnit(h.unit ?? '');
    setCategoryId(h.category_id);

    const [cats, logs] = await Promise.all([
      db.select().from(categories).where(eq(categories.user_id, user.id)),
      db.select().from(habit_logs).where(eq(habit_logs.habit_id, id)).orderBy(desc(habit_logs.date)),
    ]);
    setUserCategories(cats);
    setAllLogs(logs);
    setLoading(false);
  }, [user, id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleSave() {
    if (!name.trim() || !id) return;
    setSaving(true);
    try {
      await db.update(habits).set({
        name: name.trim(),
        description: description.trim() || null,
        unit: habit?.metric_type === 'count' ? (unit.trim() || 'times') : null,
        category_id: categoryId,
      }).where(eq(habits.id, id));
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    Alert.alert('Delete habit', 'All logs will be deleted. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await db.delete(habits).where(eq(habits.id, id!));
          router.back();
        },
      },
    ]);
  }

  async function handleDeleteLog(logId: string) {
    await db.delete(habit_logs).where(eq(habit_logs.id, logId));
    load();
  }

  // Apply log filters
  const filteredLogs = allLogs.filter(log => {
    if (logSearch && !(log.notes ?? '').toLowerCase().includes(logSearch.toLowerCase())) return false;
    if (logDateFrom && log.date < logDateFrom) return false;
    if (logDateTo && log.date > logDateTo) return false;
    return true;
  });

  const s = styles(colors);
  if (loading) return <View style={s.center}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        {/* ── Edit form ── */}
        <Text style={s.sectionTitle}>Edit Habit</Text>

        <Text style={s.label}>Name</Text>
        <TextInput
          style={s.input}
          value={name}
          onChangeText={setName}
          placeholderTextColor={colors.textMuted}
        />

        <Text style={s.label}>Description</Text>
        <TextInput
          style={[s.input, s.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="Optional"
          placeholderTextColor={colors.textMuted}
          multiline
        />

        {habit?.metric_type === 'count' && (
          <>
            <Text style={s.label}>Unit</Text>
            <TextInput style={s.input} value={unit} onChangeText={setUnit} placeholderTextColor={colors.textMuted} />
          </>
        )}

        <Text style={s.label}>Category</Text>
        <View style={s.catGrid}>
          {userCategories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[s.catChip, categoryId === cat.id && { borderColor: cat.colour, backgroundColor: cat.colour + '20' }]}
              onPress={() => setCategoryId(cat.id)}
            >
              <View style={[s.catDot, { backgroundColor: cat.colour }]} />
              <Text style={[s.catChipText, categoryId === cat.id && { color: cat.colour }]}>
                {cat.icon} {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.actionRow}>
          <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Changes</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={s.logBtn} onPress={() => router.push(`/log/${id}`)}>
            <Text style={s.logBtnText}>+ Log Entry</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
          <Text style={s.deleteBtnText}>Delete Habit</Text>
        </TouchableOpacity>

        {/* ── Log history ── */}
        <View style={s.logHeader}>
          <Text style={s.sectionTitle}>Log History</Text>
          <Text style={s.logCount}>{filteredLogs.length} entries</Text>
        </View>

        <FilterBar
          search={logSearch}
          onSearchChange={setLogSearch}
          dateFrom={logDateFrom}
          dateTo={logDateTo}
          onDateFromChange={setLogDateFrom}
          onDateToChange={setLogDateTo}
          placeholder="Search notes…"
        />

        {filteredLogs.length === 0 ? (
          <Text style={s.noLogs}>
            {allLogs.length === 0 ? 'No entries yet.' : 'No entries match your filter.'}
          </Text>
        ) : (
          filteredLogs.map(log => (
            <View key={log.id} style={s.logRow}>
              <TouchableOpacity
                style={s.logInfo}
                onPress={() => router.push(`/log/${id}?date=${log.date}`)}
              >
                <Text style={s.logDate}>{formatDate(log.date)}</Text>
                <Text style={s.logValue}>
                  {habit?.metric_type === 'boolean'
                    ? (log.value ? '✓ Done' : '✗ Missed')
                    : `${log.value} ${habit?.unit ?? ''}`}
                </Text>
                {log.notes ? <Text style={s.logNotes}>{log.notes}</Text> : null}
              </TouchableOpacity>
              <View style={s.logActions}>
                <TouchableOpacity
                  style={s.logActionBtn}
                  onPress={() => router.push(`/log/${id}?date=${log.date}`)}
                >
                  <Text style={s.editText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.logActionBtn} onPress={() => handleDeleteLog(log.id)}>
                  <Text style={s.deleteText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: ReturnType<typeof import('../../context/ThemeContext').useTheme>['colors']) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 12 },
    label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 6, marginTop: 14 },
    input: {
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text,
    },
    multiline: { minHeight: 72, textAlignVertical: 'top' },
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    catChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, gap: 6 },
    catDot: { width: 8, height: 8, borderRadius: 4 },
    catChipText: { fontSize: 13, fontWeight: '600', color: colors.text },
    actionRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
    saveBtn: { flex: 2, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    logBtn: { flex: 1, borderWidth: 1.5, borderColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    logBtnText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
    deleteBtn: { marginTop: 12, paddingVertical: 14, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.danger + '50' },
    deleteBtnText: { color: colors.danger, fontSize: 15, fontWeight: '600' },
    logHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 12 },
    logCount: { fontSize: 12, color: colors.textMuted, backgroundColor: colors.inputBg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    logRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.card, borderRadius: 10, padding: 12,
      marginBottom: 8, borderWidth: 1, borderColor: colors.border,
    },
    logInfo: { flex: 1 },
    logDate: { fontSize: 13, fontWeight: '600', color: colors.text },
    logValue: { fontSize: 14, color: colors.primary, fontWeight: '700', marginTop: 2 },
    logNotes: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    logActions: { flexDirection: 'row', gap: 4, alignItems: 'center' },
    logActionBtn: { padding: 8 },
    editText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
    deleteText: { color: colors.danger, fontSize: 16 },
    noLogs: { color: colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  });
