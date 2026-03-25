import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { Link, Redirect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function LoginScreen() {
  const { user, login } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  if (user) return <Redirect href="/(app)/today" />;

  function validate() {
    const e: typeof errors = {};
    if (!email.trim()) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Enter a valid email address.';
    if (!password) e.password = 'Password is required.';
    return e;
  }

  async function handleLogin() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setErrors({ general: err.message ?? 'Login failed' });
    } finally {
      setLoading(false);
    }
  }

  const s = styles(colors);

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={s.logo}>🔥</Text>
          <Text style={s.appName}>Streakly</Text>
          <Text style={s.subtitle}>Build habits. Keep streaks.</Text>
        </View>

        <View style={s.form}>
          {errors.general ? (
            <View style={s.errorBanner} accessibilityRole="alert">
              <Text style={s.errorBannerText}>{errors.general}</Text>
            </View>
          ) : null}

          <Text style={s.label}>Email</Text>
          <TextInput
            style={[s.input, errors.email && s.inputError]}
            value={email}
            onChangeText={v => { setEmail(v); setErrors(p => ({ ...p, email: undefined })); }}
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Email address"
          />
          {errors.email ? <Text style={s.fieldError}>{errors.email}</Text> : null}

          <Text style={s.label}>Password</Text>
          <TextInput
            style={[s.input, errors.password && s.inputError]}
            value={password}
            onChangeText={v => { setPassword(v); setErrors(p => ({ ...p, password: undefined })); }}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            accessibilityLabel="Password"
          />
          {errors.password ? <Text style={s.fieldError}>{errors.password}</Text> : null}

          <TouchableOpacity
            style={s.primaryBtn}
            onPress={handleLogin}
            disabled={loading}
            accessibilityLabel="Sign in"
            accessibilityRole="button"
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.primaryBtnText}>Sign In</Text>
            }
          </TouchableOpacity>

          <View style={s.footer}>
            <Text style={s.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity accessibilityLabel="Create account" accessibilityRole="link">
                <Text style={s.linkText}>Sign up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: ReturnType<typeof import('../../context/ThemeContext').useTheme>['colors']) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    header: { alignItems: 'center', marginBottom: 40 },
    logo: { fontSize: 56 },
    appName: { fontSize: 32, fontWeight: '800', color: colors.text, marginTop: 8 },
    subtitle: { fontSize: 15, color: colors.textMuted, marginTop: 4 },
    form: { gap: 4 },
    label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 2, marginTop: 12 },
    input: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      color: colors.text,
    },
    inputError: { borderColor: colors.danger },
    fieldError: { fontSize: 12, color: colors.danger, marginTop: 4 },
    primaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 20,
    },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
    footerText: { color: colors.textMuted, fontSize: 14 },
    linkText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
    errorBanner: {
      backgroundColor: colors.danger + '18',
      borderRadius: 8,
      padding: 12,
      marginBottom: 4,
    },
    errorBannerText: { color: colors.danger, fontSize: 13 },
  });
