import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { weekProgress, monthProgress } from '../utils/date';

export type TargetStatus = 'exceeded' | 'on_track' | 'at_risk' | 'failed';

export function getTargetStatus(
  current: number,
  target: number,
  period: 'weekly' | 'monthly'
): TargetStatus {
  if (target <= 0) return 'on_track';
  const pct = current / target;
  if (pct >= 1) return 'exceeded';
  const progress = period === 'weekly' ? weekProgress() : monthProgress();
  const pace = progress > 0 ? pct / progress : pct;
  if (pace >= 0.8) return 'on_track';
  if (pace >= 0.4) return 'at_risk';
  return 'failed';
}

export const STATUS_COLOURS: Record<TargetStatus, string> = {
  exceeded: '#3b82f6',
  on_track: '#22c55e',
  at_risk: '#f59e0b',
  failed: '#ef4444',
};

export const STATUS_LABELS: Record<TargetStatus, string> = {
  exceeded: '🎉 Exceeded',
  on_track: '✓ On track',
  at_risk: '⚠️ At risk',
  failed: '✗ Behind',
};

type Props = {
  habitName: string;
  period: 'weekly' | 'monthly';
  target_value: number;
  current: number;
  compact?: boolean;
};

export default function TargetProgress({ habitName, period, target_value, current, compact }: Props) {
  const { colors } = useTheme();
  const status = getTargetStatus(current, target_value, period);
  const statusColor = STATUS_COLOURS[status];
  const fillPct = Math.min(current / Math.max(target_value, 1), 1) * 100;

  const s = styles(colors);

  if (compact) {
    return (
      <View style={s.compact}>
        <View style={s.compactHeader}>
          <Text style={s.compactName} numberOfLines={1}>{habitName}</Text>
          <Text style={[s.compactStatus, { color: statusColor }]}>{current}/{target_value}</Text>
        </View>
        <View style={s.progressBg}>
          <View style={[s.progressFill, { width: `${fillPct}%` as any, backgroundColor: statusColor }]} />
        </View>
      </View>
    );
  }

  return (
    <View style={s.card}>
      <View style={s.row}>
        <View style={s.info}>
          <Text style={s.name}>{habitName}</Text>
          <Text style={s.period}>{period === 'weekly' ? 'Weekly' : 'Monthly'} target</Text>
        </View>
        <View style={[s.badge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[s.badgeText, { color: statusColor }]}>{STATUS_LABELS[status]}</Text>
        </View>
      </View>
      <View style={s.progressBg}>
        <View style={[s.progressFill, { width: `${fillPct}%` as any, backgroundColor: statusColor }]} />
      </View>
      <View style={s.valueRow}>
        <Text style={s.valueText}>{current} done</Text>
        <Text style={s.valueText}>Goal: {target_value}</Text>
      </View>
    </View>
  );
}

const styles = (colors: ReturnType<typeof import('../context/ThemeContext').useTheme>['colors']) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    info: { flex: 1, marginRight: 10 },
    name: { fontSize: 14, fontWeight: '600', color: colors.text },
    period: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    badgeText: { fontSize: 12, fontWeight: '700' },
    progressBg: { height: 7, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 4 },
    valueRow: { flexDirection: 'row', justifyContent: 'space-between' },
    valueText: { fontSize: 11, color: colors.textMuted },
    // compact variant
    compact: { gap: 6, marginBottom: 4 },
    compactHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    compactName: { fontSize: 13, color: colors.text, flex: 1 },
    compactStatus: { fontSize: 12, fontWeight: '700' },
  });
