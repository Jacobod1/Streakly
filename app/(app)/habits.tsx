import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { habits, categories } from '../../db/schema';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import FilterBar from '../../components/FilterBar';
import SwipeableRow from '../../components/SwipeableRow';

type HabitWithCat = {
  habit: typeof habits.$inferSelect;
  category: typeof categories.$inferSelect;
};

export default function HabitsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [rows, setRows] = useState<HabitWithCat[]>([]);
  const [allCategories, setAllCategories] = useState<(typeof categories.$inferSelect)[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');

  const load = useCallback(async () => {
    if (!user) return;
    const [data, cats] = await Promise.all([
      db.select({ habit: habits, category: categories })
        .from(habits)
        .innerJoin(categories, eq(habits.category_id, categories.id))
        .where(eq(habits.user_id, user.id)),
      db.select().from(categories).where(eq(categories.user_id, user.id)),
    ]);
    setRows(data);
    setAllCategories(cats);
    setLoading(false);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleDelete(id: string) {
    Alert.alert('Delete habit', 'This will delete all logs for this habit. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await db.delete(habits).where(eq(habits.id, id));
          load();
        },
      },
    ]);
  }

  async function handleToggleActive(id: string, current: boolean) {
    await db.update(habits).set({ is_active: !current }).where(eq(habits.id, id));
    load();
  }

  // Apply filters
  const filtered = rows.filter(({ habit, category }) => {
    if (search && !habit.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedCategory && category.id !== selectedCategory) return false;
    if (statusFilter === 'active' && !habit.is_active) return false;
    if (statusFilter === 'paused' && habit.is_active) return false;
    return true;
  });

  // Group filtered results by category
  const grouped = filtered.reduce<Record<string, HabitWithCat[]>>((acc, row) => {
    const key = row.category.id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  const s = styles(colors);

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>My Habits</Text>

        <FilterBar
          search={search}
          onSearchChange={setSearch}
          categories={allCategories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          placeholder="Search habits…"
        />

        {Object.keys(grouped).length === 0 ? (
          <View style={s.empty}>
            {rows.length === 0 ? (
              <>
                <Text style={s.emptyIcon}>📋</Text>
                <Text style={s.emptyTitle}>No habits yet</Text>
                <Text style={s.emptyText}>Tap + to create your first habit.</Text>
              </>
            ) : (
              <>
                <Text style={s.emptyIcon}>🔍</Text>
                <Text style={s.emptyTitle}>No results</Text>
                <Text style={s.emptyText}>Try adjusting your filters.</Text>
              </>
            )}
          </View>
        ) : (
          Object.entries(grouped).map(([catId, catRows]) => {
            const cat = catRows[0].category;
            return (
              <View key={catId} style={s.group}>
                <View style={s.groupHeader}>
                  <View style={[s.catDot, { backgroundColor: cat.colour }]} />
                  <Text style={s.groupTitle}>{cat.icon} {cat.name}</Text>
                  <Text style={s.groupCount}>{catRows.length}</Text>
                </View>
                {catRows.map(({ habit }) => (
                  <SwipeableRow key={habit.id} onDelete={() => handleDelete(habit.id)} deleteLabel="Delete">
                    <View style={[s.card, !habit.is_active && s.cardInactive]}>
                      <TouchableOpacity
                        style={s.cardMain}
                        onPress={() => router.push(`/habits/${habit.id}`)}
                        accessibilityLabel={`Edit habit: ${habit.name}`}
                        accessibilityRole="button"
                      >
                        <Text style={[s.habitName, !habit.is_active && s.habitNameInactive]}>
                          {habit.name}
                        </Text>
                        <View style={s.metaRow}>
                          <Text style={s.habitMeta}>
                            {habit.metric_type === 'count'
                              ? `# Count · ${habit.unit ?? 'times'}`
                              : '✓ Yes / No'}
                          </Text>
                          {!habit.is_active && (
                            <View style={s.pausedBadge}>
                              <Text style={s.pausedText}>Paused</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                      <View style={s.cardActions}>
                        <TouchableOpacity
                          style={s.actionBtn}
                          onPress={() => handleToggleActive(habit.id, habit.is_active)}
                          accessibilityLabel={habit.is_active ? 'Pause habit' : 'Resume habit'}
                        >
                          <Ionicons
                            name={habit.is_active ? 'pause-circle-outline' : 'play-circle-outline'}
                            size={22}
                            color={colors.textMuted}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={s.actionBtn}
                          onPress={() => router.push(`/habits/${habit.id}`)}
                          accessibilityLabel={`Edit ${habit.name}`}
                        >
                          <Ionicons name="pencil-outline" size={20} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={s.actionBtn}
                          onPress={() => handleDelete(habit.id)}
                          accessibilityLabel={`Delete ${habit.name}`}
                        >
                          <Ionicons name="trash-outline" size={20} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </SwipeableRow>
                ))}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[s.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/habits/new')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = (colors: ReturnType<typeof import('../../context/ThemeContext').useTheme>['colors']) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 90 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    title: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 12 },
    group: { marginBottom: 20 },
    groupHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
    catDot: { width: 8, height: 8, borderRadius: 4 },
    groupTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
    groupCount: { fontSize: 12, color: colors.textMuted, backgroundColor: colors.inputBg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
    card: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.card, borderRadius: 12, padding: 14,
      marginBottom: 8, borderWidth: 1, borderColor: colors.border,
    },
    cardInactive: { opacity: 0.6 },
    cardMain: { flex: 1 },
    habitName: { fontSize: 15, fontWeight: '600', color: colors.text },
    habitNameInactive: { color: colors.textMuted },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
    habitMeta: { fontSize: 12, color: colors.textMuted },
    pausedBadge: { backgroundColor: colors.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    pausedText: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
    cardActions: { flexDirection: 'row', gap: 4 },
    actionBtn: { padding: 6 },
    empty: { alignItems: 'center', marginTop: 60 },
    emptyIcon: { fontSize: 48 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 12 },
    emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 6 },
    fab: {
      position: 'absolute', bottom: 24, right: 20,
      width: 56, height: 56, borderRadius: 28,
      justifyContent: 'center', alignItems: 'center',
      elevation: 4, shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2, shadowRadius: 4,
    },
  });
