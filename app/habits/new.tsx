import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { eq } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';
import { db } from '../../db';
import { habits, categories } from '../../db/schema';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function NewHabitScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [metricType, setMetricType] = useState<'boolean' | 'count'>('boolean');
  const [unit, setUnit] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [userCategories, setUserCategories] = useState<(typeof categories.$inferSelect)[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      db.select().from(categories).where(eq(categories.user_id, user.id)).then(cats => {
        setUserCategories(cats);
        if (cats.length > 0) setCategoryId(cats[0].id);
      });
    }
  }, [user]);

  async function handleSave() {
    if (!name.trim()) { Alert.alert('Name required', 'Please enter a habit name.'); return; }
    if (!categoryId) { Alert.alert('Category required', 'Please select a category.'); return; }
    setSaving(true);
    try {
      await db.insert(habits).values({
        id: Crypto.randomUUID(),
        user_id: user!.id,
        category_id: categoryId,
        name: name.trim(),
        description: description.trim() || null,
        metric_type: metricType,
        unit: metricType === 'count' ? (unit.trim() || 'times') : null,
        is_active: true,
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
        <Text style={s.label}>Name *</Text>
        <TextInput
          style={s.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Morning Run"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={s.label}>Description</Text>
        <TextInput
          style={[s.input, s.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="Optional description"
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={3}
        />

        <Text style={s.label}>Tracking Type *</Text>
        <View style={s.segmented}>
          {(['boolean', 'count'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[s.segment, metricType === t && s.segmentActive]}
              onPress={() => setMetricType(t)}
            >
              <Text style={[s.segmentText, metricType === t && s.segmentTextActive]}>
                {t === 'boolean' ? '✓ Yes / No' : '# Count'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {metricType === 'count' && (
          <>
            <Text style={s.label}>Unit</Text>
            <TextInput
              style={s.input}
              value={unit}
              onChangeText={setUnit}
              placeholder="e.g. minutes, reps, glasses"
              placeholderTextColor={colors.textMuted}
            />
          </>
        )}

        <Text style={s.label}>Category *</Text>
        {userCategories.length === 0 ? (
          <Text style={s.noCats}>No categories yet — add one in Settings first.</Text>
        ) : (
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
        )}

        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Create Habit</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: ReturnType<typeof import('../../context/ThemeContext').useTheme>['colors']) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 6, marginTop: 16 },
    input: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
    },
    multiline: { minHeight: 80, textAlignVertical: 'top' },
    segmented: { flexDirection: 'row', gap: 10 },
    segment: {
      flex: 1, paddingVertical: 12,
      borderRadius: 10, borderWidth: 1.5, borderColor: colors.border,
      alignItems: 'center',
    },
    segmentActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
    segmentText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
    segmentTextActive: { color: colors.primary },
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    catChip: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 12, paddingVertical: 8,
      borderRadius: 10, borderWidth: 1.5, borderColor: colors.border,
      gap: 6,
    },
    catDot: { width: 8, height: 8, borderRadius: 4 },
    catChipText: { fontSize: 13, fontWeight: '600', color: colors.text },
    noCats: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
    saveBtn: {
      backgroundColor: colors.primary, borderRadius: 12,
      paddingVertical: 16, alignItems: 'center', marginTop: 28,
    },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
