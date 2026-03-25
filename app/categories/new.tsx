import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { db } from '../../db';
import { categories } from '../../db/schema';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const PRESET_COLOURS = ['#ef4444','#f97316','#eab308','#22c55e','#14b8a6','#3b82f6','#8b5cf6','#ec4899','#6b7280'];
const PRESET_ICONS = ['🏃','💧','📚','🧘','💪','😴','🥗','💊','🎯','🎨','🎵','💻'];

export default function NewCategoryScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [name, setName] = useState('');
  const [colour, setColour] = useState(PRESET_COLOURS[0]);
  const [icon, setIcon] = useState(PRESET_ICONS[0]);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) { Alert.alert('Name required'); return; }
    setSaving(true);
    try {
      await db.insert(categories).values({
        id: Crypto.randomUUID(),
        user_id: user!.id,
        name: name.trim(),
        colour,
        icon,
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
        {/* Preview */}
        <View style={s.preview}>
          <View style={[s.previewDot, { backgroundColor: colour }]}>
            <Text style={s.previewIcon}>{icon}</Text>
          </View>
          <Text style={s.previewName}>{name || 'Category Name'}</Text>
        </View>

        <Text style={s.label}>Name *</Text>
        <TextInput
          style={s.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Health"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={s.label}>Colour</Text>
        <View style={s.colorGrid}>
          {PRESET_COLOURS.map(c => (
            <TouchableOpacity
              key={c}
              style={[s.colorSwatch, { backgroundColor: c }, colour === c && s.colorSwatchSelected]}
              onPress={() => setColour(c)}
            />
          ))}
        </View>

        <Text style={s.label}>Icon</Text>
        <View style={s.iconGrid}>
          {PRESET_ICONS.map(ic => (
            <TouchableOpacity
              key={ic}
              style={[s.iconChip, icon === ic && { borderColor: colour, backgroundColor: colour + '20' }]}
              onPress={() => setIcon(ic)}
            >
              <Text style={s.iconEmoji}>{ic}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[s.saveBtn, { backgroundColor: colour }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Create Category</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: ReturnType<typeof import('../../context/ThemeContext').useTheme>['colors']) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    preview: { alignItems: 'center', marginBottom: 20 },
    previewDot: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    previewIcon: { fontSize: 28 },
    previewName: { fontSize: 18, fontWeight: '700', color: colors.text },
    label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8, marginTop: 16 },
    input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text },
    colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    colorSwatch: { width: 36, height: 36, borderRadius: 18 },
    colorSwatchSelected: { borderWidth: 3, borderColor: colors.text },
    iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    iconChip: { width: 48, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
    iconEmoji: { fontSize: 22 },
    saveBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 28 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
