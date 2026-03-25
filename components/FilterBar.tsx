import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

type Category = { id: string; name: string; colour: string; icon: string };

type Props = {
  search: string;
  onSearchChange: (v: string) => void;
  categories?: Category[];
  selectedCategory?: string | null;
  onCategoryChange?: (id: string | null) => void;
  statusFilter?: 'all' | 'active' | 'paused';
  onStatusChange?: (s: 'all' | 'active' | 'paused') => void;
  /** Pass a date-range filter for log history */
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange?: (d: string) => void;
  onDateToChange?: (d: string) => void;
  placeholder?: string;
};

export default function FilterBar({
  search,
  onSearchChange,
  categories,
  selectedCategory,
  onCategoryChange,
  statusFilter,
  onStatusChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  placeholder = 'Search…',
}: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const hasActiveFilter =
    search.length > 0 ||
    selectedCategory != null ||
    (statusFilter && statusFilter !== 'all') ||
    !!dateFrom ||
    !!dateTo;

  const s = styles(colors);

  return (
    <View style={s.root}>
      {/* Toggle row */}
      <View style={s.toggleRow}>
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} style={s.searchIcon} />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={onSearchChange}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[s.filterBtn, hasActiveFilter && s.filterBtnActive]}
          onPress={() => setOpen(v => !v)}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={hasActiveFilter ? colors.primary : colors.textMuted}
          />
          {hasActiveFilter && <View style={s.activeDot} />}
        </TouchableOpacity>
      </View>

      {/* Expanded filters */}
      {open && (
        <View style={s.expanded}>
          {/* Category chips */}
          {categories && categories.length > 0 && onCategoryChange && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
                <TouchableOpacity
                  style={[s.chip, selectedCategory == null && s.chipActive]}
                  onPress={() => onCategoryChange(null)}
                >
                  <Text style={[s.chipText, selectedCategory == null && s.chipTextActive]}>All</Text>
                </TouchableOpacity>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      s.chip,
                      selectedCategory === cat.id && { borderColor: cat.colour, backgroundColor: cat.colour + '20' },
                    ]}
                    onPress={() => onCategoryChange(selectedCategory === cat.id ? null : cat.id)}
                  >
                    <View style={[s.chipDot, { backgroundColor: cat.colour }]} />
                    <Text
                      style={[
                        s.chipText,
                        selectedCategory === cat.id && { color: cat.colour },
                      ]}
                    >
                      {cat.icon} {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Status filter */}
          {onStatusChange && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>Status</Text>
              <View style={s.segmented}>
                {(['all', 'active', 'paused'] as const).map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[s.segment, statusFilter === opt && s.segmentActive]}
                    onPress={() => onStatusChange(opt)}
                  >
                    <Text style={[s.segmentText, statusFilter === opt && s.segmentTextActive]}>
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Date range */}
          {onDateFromChange && onDateToChange && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>Date Range</Text>
              <View style={s.dateRow}>
                <View style={s.dateInputWrap}>
                  <Text style={s.dateLabel}>From</Text>
                  <TextInput
                    style={s.dateInput}
                    value={dateFrom ?? ''}
                    onChangeText={onDateFromChange}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={s.dateInputWrap}>
                  <Text style={s.dateLabel}>To</Text>
                  <TextInput
                    style={s.dateInput}
                    value={dateTo ?? ''}
                    onChangeText={onDateToChange}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Clear all */}
          {hasActiveFilter && (
            <TouchableOpacity
              style={s.clearBtn}
              onPress={() => {
                onSearchChange('');
                onCategoryChange?.(null);
                onStatusChange?.('all');
                onDateFromChange?.('');
                onDateToChange?.('');
              }}
            >
              <Text style={s.clearBtnText}>Clear all filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = (colors: ReturnType<typeof import('../context/ThemeContext').useTheme>['colors']) =>
  StyleSheet.create({
    root: { marginBottom: 12 },
    toggleRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    searchWrap: {
      flex: 1, flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.card, borderRadius: 10, borderWidth: 1,
      borderColor: colors.border, paddingHorizontal: 10, height: 40,
    },
    searchIcon: { marginRight: 6 },
    searchInput: { flex: 1, fontSize: 14, color: colors.text },
    filterBtn: {
      width: 40, height: 40, borderRadius: 10, borderWidth: 1,
      borderColor: colors.border, backgroundColor: colors.card,
      justifyContent: 'center', alignItems: 'center',
    },
    filterBtnActive: { borderColor: colors.primary },
    activeDot: {
      position: 'absolute', top: 6, right: 6,
      width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary,
    },
    expanded: {
      backgroundColor: colors.card, borderRadius: 12, padding: 12,
      marginTop: 8, borderWidth: 1, borderColor: colors.border, gap: 12,
    },
    section: { gap: 6 },
    sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
    chips: { flexDirection: 'row', gap: 6, paddingRight: 8 },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 10, paddingVertical: 6,
      borderRadius: 8, borderWidth: 1.5, borderColor: colors.border,
    },
    chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
    chipDot: { width: 6, height: 6, borderRadius: 3 },
    chipText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
    chipTextActive: { color: colors.primary },
    segmented: { flexDirection: 'row', gap: 6 },
    segment: {
      flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5,
      borderColor: colors.border, alignItems: 'center',
    },
    segmentActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
    segmentText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
    segmentTextActive: { color: colors.primary },
    dateRow: { flexDirection: 'row', gap: 10 },
    dateInputWrap: { flex: 1, gap: 4 },
    dateLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
    dateInput: {
      backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border,
      borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: colors.text,
    },
    clearBtn: { alignItems: 'center', paddingVertical: 8 },
    clearBtnText: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  });
