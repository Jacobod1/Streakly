import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Switch, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { eq, and, gte, sql } from 'drizzle-orm';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../db';
import { categories, targets, habits, habit_logs } from '../../db/schema';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { exportCSV } from '../../utils/csvExporter';
import TargetProgress from '../../components/TargetProgress';
import { getWeekStart, daysAgo } from '../../utils/date';
import { runSeed } from '../../db/seed';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const NOTIF_KEY = 'streakly_notifications';
const NOTIF_HOUR_KEY = 'streakly_notif_hour';
const NOTIF_MINUTE_KEY = 'streakly_notif_minute';

export default function SettingsScreen() {
  const { user, logout, deleteAccount } = useAuth();
  const { colors, theme, toggleTheme } = useTheme();
  const router = useRouter();

  const [userCategories, setUserCategories] = useState<(typeof categories.$inferSelect)[]>([]);
  const [userTargets, setUserTargets] = useState<
    (typeof targets.$inferSelect & { habitName?: string; current: number; metricType?: string })[]
  >([]);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifTime, setNotifTime] = useState(() => {
    const d = new Date();
    d.setHours(20, 0, 0, 0);
    return d;
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [csvFrom, setCsvFrom] = useState('');
  const [csvTo, setCsvTo] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    const [cats, tgts, notifVal, hourVal, minuteVal] = await Promise.all([
      db.select().from(categories).where(eq(categories.user_id, user.id)),
      db.select().from(targets).where(eq(targets.user_id, user.id)),
      AsyncStorage.getItem(NOTIF_KEY),
      AsyncStorage.getItem(NOTIF_HOUR_KEY),
      AsyncStorage.getItem(NOTIF_MINUTE_KEY),
    ]);
    setUserCategories(cats);

    const weekStart = getWeekStart();
    const monthStart = daysAgo(new Date().getDate() - 1);
    const enriched = await Promise.all(
      tgts.map(async t => {
        const [h] = await db
          .select({ name: habits.name, metric_type: habits.metric_type })
          .from(habits)
          .where(eq(habits.id, t.habit_id));
        const periodStart = t.period === 'weekly' ? weekStart : monthStart;
        const periodLogs = await db
          .select({ value: habit_logs.value })
          .from(habit_logs)
          .where(
            and(
              eq(habit_logs.habit_id, t.habit_id),
              gte(habit_logs.date, periodStart),
              sql`${habit_logs.value} > 0`
            )
          );
        const current = h?.metric_type === 'count'
          ? periodLogs.reduce((s, l) => s + l.value, 0)
          : periodLogs.length;
        return { ...t, habitName: h?.name, current, metricType: h?.metric_type };
      })
    );
    setUserTargets(enriched);
    setNotifEnabled(notifVal === 'true');

    if (hourVal !== null && minuteVal !== null) {
      const d = new Date();
      d.setHours(parseInt(hourVal, 10), parseInt(minuteVal, 10), 0, 0);
      setNotifTime(d);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function scheduleNotification(hour: number, minute: number) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Time to log your habits! 🔥', body: 'Keep your streaks alive.' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });
  }

  async function handleToggleNotifs(val: boolean) {
    if (val) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Enable notifications in your device Settings.');
        return;
      }
      await scheduleNotification(notifTime.getHours(), notifTime.getMinutes());
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
    await AsyncStorage.setItem(NOTIF_KEY, val ? 'true' : 'false');
    setNotifEnabled(val);
  }

  async function handleTimeChange(_: any, date?: Date) {
    if (Platform.OS !== 'ios') setShowTimePicker(false);
    if (!date) return;
    setNotifTime(date);
    const h = date.getHours();
    const m = date.getMinutes();
    await AsyncStorage.setItem(NOTIF_HOUR_KEY, String(h));
    await AsyncStorage.setItem(NOTIF_MINUTE_KEY, String(m));
    if (notifEnabled) {
      await scheduleNotification(h, m);
    }
  }

  const notifTimeLabel = notifTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  async function handleSeed() {
    Alert.alert('Seed data', 'This will replace all existing data with demo data. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Seed', onPress: async () => {
          setSeeding(true);
          try {
            await runSeed();
            Alert.alert('Done', 'Demo data loaded. Please restart the app.');
          } catch (e: any) {
            Alert.alert('Error', e.message);
          } finally {
            setSeeding(false);
          }
        },
      },
    ]);
  }

  async function handleExport() {
    if (!user) return;
    setExporting(true);
    try {
      await exportCSV(user.id, csvFrom || undefined, csvTo || undefined);
    } catch (e: any) {
      Alert.alert('Export failed', e.message);
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteCategory(id: string) {
    Alert.alert('Delete category', 'All habits in this category will be deleted. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => { await db.delete(categories).where(eq(categories.id, id)); load(); },
      },
    ]);
  }

  async function handleDeleteTarget(id: string) {
    await db.delete(targets).where(eq(targets.id, id));
    load();
  }

  function confirmLogout() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', onPress: logout },
    ]);
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete account',
      'This will permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteAccount },
      ]
    );
  }

  const s = styles(colors);

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <Text style={s.title}>Settings</Text>

      {/* Account */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>ACCOUNT</Text>
        <View style={s.card}>
          <View style={[s.avatar, { backgroundColor: user?.avatar_colour ?? '#3B82F6' }]}>
            <Text style={s.avatarText}>{user?.username?.[0]?.toUpperCase()}</Text>
          </View>
          <View style={s.accountInfo}>
            <Text style={s.accountName}>{user?.username}</Text>
            <Text style={s.accountEmail}>{user?.email}</Text>
          </View>
        </View>
      </View>

      {/* Appearance */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>APPEARANCE</Text>
        <View style={s.row}>
          <Ionicons name={theme === 'dark' ? 'moon' : 'sunny-outline'} size={20} color={colors.primary} />
          <Text style={s.rowLabel}>Dark Mode</Text>
          <Switch
            value={theme === 'dark'}
            onValueChange={toggleTheme}
            trackColor={{ true: colors.primary }}
            accessibilityLabel="Toggle dark mode"
          />
        </View>
      </View>

      {/* Notifications */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>NOTIFICATIONS</Text>
        <View style={s.row}>
          <Ionicons name="notifications-outline" size={20} color={colors.primary} />
          <Text style={s.rowLabel}>Daily Reminder</Text>
          <Switch
            value={notifEnabled}
            onValueChange={handleToggleNotifs}
            trackColor={{ true: colors.primary }}
            accessibilityLabel="Toggle daily reminder"
          />
        </View>
        {notifEnabled && (
          <TouchableOpacity
            style={s.row}
            onPress={() => setShowTimePicker(true)}
            accessibilityLabel={`Reminder time: ${notifTimeLabel}`}
          >
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <Text style={s.rowLabel}>Reminder Time</Text>
            <Text style={[s.rowLabel, { flex: 0, color: colors.primary, fontWeight: '700' }]}>
              {notifTimeLabel}
            </Text>
          </TouchableOpacity>
        )}
        {showTimePicker && (
          <DateTimePicker
            value={notifTime}
            mode="time"
            is24Hour={true}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
          />
        )}
      </View>

      {/* Categories */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>CATEGORIES</Text>
        {userCategories.map(cat => (
          <View key={cat.id} style={s.listRow}>
            <View style={[s.catDot, { backgroundColor: cat.colour }]} />
            <Text style={s.listRowText}>{cat.icon} {cat.name}</Text>
            <View style={s.listRowActions}>
              <TouchableOpacity
                onPress={() => router.push(`/categories/${cat.id}`)}
                style={s.iconBtn}
                accessibilityLabel={`Edit category ${cat.name}`}
              >
                <Ionicons name="pencil-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteCategory(cat.id)}
                style={s.iconBtn}
                accessibilityLabel={`Delete category ${cat.name}`}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
        <TouchableOpacity style={s.addBtn} onPress={() => router.push('/categories/new')} accessibilityLabel="Add category">
          <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
          <Text style={s.addBtnText}>Add Category</Text>
        </TouchableOpacity>
      </View>

      {/* Targets */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>TARGETS</Text>
        {userTargets.map(t => (
          <View key={t.id} style={s.targetCard}>
            <TargetProgress
              habitName={t.habitName ?? '—'}
              period={t.period}
              target_value={t.target_value}
              current={t.current}
            />
            <View style={s.targetActions}>
              <TouchableOpacity
                onPress={() => router.push(`/targets/${t.id}`)}
                style={s.iconBtn}
                accessibilityLabel={`Edit target for ${t.habitName}`}
              >
                <Ionicons name="pencil-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteTarget(t.id)}
                style={s.iconBtn}
                accessibilityLabel={`Delete target for ${t.habitName}`}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
        <TouchableOpacity style={s.addBtn} onPress={() => router.push('/targets/new')} accessibilityLabel="Add target">
          <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
          <Text style={s.addBtnText}>Add Target</Text>
        </TouchableOpacity>
      </View>

      {/* Data */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>DATA</Text>
        <TouchableOpacity style={s.row} onPress={handleSeed} disabled={seeding} accessibilityLabel="Load demo data">
          <Ionicons name="flask-outline" size={20} color={colors.primary} />
          <Text style={s.rowLabel}>Load Demo Data</Text>
          {seeding && <ActivityIndicator size="small" color={colors.primary} />}
        </TouchableOpacity>

        {/* CSV export with optional date range */}
        <View style={s.csvSection}>
          <View style={s.csvHeader}>
            <Ionicons name="download-outline" size={20} color={colors.primary} />
            <Text style={s.rowLabel}>Export CSV</Text>
          </View>
          <View style={s.csvDateRow}>
            <View style={s.csvDateField}>
              <Text style={s.csvDateLabel}>From</Text>
              <TouchableOpacity
                style={s.csvDateInput}
                accessibilityLabel="CSV export from date"
              >
                <Text style={[s.csvDateInputText, !csvFrom && { color: colors.textMuted }]}>
                  {csvFrom || 'YYYY-MM-DD'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={s.csvDateField}>
              <Text style={s.csvDateLabel}>To</Text>
              <TouchableOpacity
                style={s.csvDateInput}
                accessibilityLabel="CSV export to date"
              >
                <Text style={[s.csvDateInputText, !csvTo && { color: colors.textMuted }]}>
                  {csvTo || 'YYYY-MM-DD'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={[s.row, { marginBottom: 0 }]}
            onPress={handleExport}
            disabled={exporting}
            accessibilityLabel="Export habit logs to CSV"
          >
            <Text style={[s.rowLabel, { color: colors.primary, fontWeight: '700' }]}>
              Export All Logs
            </Text>
            {exporting && <ActivityIndicator size="small" color={colors.primary} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Account actions */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>ACCOUNT ACTIONS</Text>
        <TouchableOpacity style={s.row} onPress={confirmLogout} accessibilityLabel="Log out">
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={[s.rowLabel, { color: colors.danger }]}>Log out</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.row} onPress={confirmDeleteAccount} accessibilityLabel="Delete account">
          <Ionicons name="person-remove-outline" size={20} color={colors.danger} />
          <Text style={[s.rowLabel, { color: colors.danger }]}>Delete Account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = (colors: ReturnType<typeof import('../../context/ThemeContext').useTheme>['colors']) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    title: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 16 },
    section: { marginBottom: 24 },
    sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8, marginBottom: 8, textTransform: 'uppercase' },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
    accountInfo: { flex: 1 },
    accountName: { fontSize: 15, fontWeight: '600', color: colors.text },
    accountEmail: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    rowLabel: { flex: 1, fontSize: 15, color: colors.text },
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    catDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
    listRowText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
    listRowActions: { flexDirection: 'row', gap: 4 },
    iconBtn: { padding: 6 },
    targetCard: { marginBottom: 8 },
    targetActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: -4, gap: 4 },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary + '50',
      borderStyle: 'dashed',
    },
    addBtnText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
    csvSection: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 8,
      gap: 10,
    },
    csvHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    csvDateRow: { flexDirection: 'row', gap: 10 },
    csvDateField: { flex: 1 },
    csvDateLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted, marginBottom: 4 },
    csvDateInput: {
      backgroundColor: colors.inputBg,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    csvDateInputText: { fontSize: 13, color: colors.text },
  });
