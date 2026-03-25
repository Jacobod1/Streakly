import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { Link, Redirect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

type FieldErrors = {
  username?: string;
  email?: string;
  password?: string;
  confirm?: string;
  general?: string;
};

export default function RegisterScreen() {
  const { user, register } = useAuth();
  const { colors } = useTheme();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  if (user) return <Redirect href="/(app)/today" />;

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (!username.trim()) e.username = 'Username is required.';
    else if (username.trim().length < 2) e.username = 'Username must be at least 2 characters.';
    if (!email.trim()) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Enter a valid email address.';
    if (!password) e.password = 'Password is required.';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters.';
    if (!confirm) e.confirm = 'Please confirm your password.';
    else if (password !== confirm) e.confirm = 'Passwords do not match.';
    return e;
  }

  async function handleRegister() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    try {
      await register(username.trim(), email.trim(), password);
    } catch (err: any) {
      setErrors({ general: err.message ?? 'Registration failed' });
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
          <Text style={s.appName}>Create Account</Text>
          <Text style={s.subtitle}>Start building better habits today</Text>
        </View>

        <View style={s.form}>
          {errors.general ? (
            <View style={s.errorBanner} accessibilityRole="alert">
              <Text style={s.errorBannerText}>{errors.general}</Text>
            </View>
          ) : null}

          <Text style={s.label}>Username</Text>
          <TextInput
            style={[s.input, errors.username && s.inputError]}
            value={username}
            onChangeText={v => { setUsername(v); setErrors(p => ({ ...p, username: undefined })); }}
            placeholder="e.g. jacob"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Username"
          />
          {errors.username ? <Text style={s.fieldError}>{errors.username}</Text> : null}

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
            placeholder="At least 6 characters"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            accessibilityLabel="Password"
          />
          {errors.password ? <Text style={s.fieldError}>{errors.password}</Text> : null}

          <Text style={s.label}>Confirm Password</Text>
          <TextInput
            style={[s.input, errors.confirm && s.inputError]}
            value={confirm}
            onChangeText={v => { setConfirm(v); setErrors(p => ({ ...p, confirm: undefined })); }}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            accessibilityLabel="Confirm password"
          />
          {errors.confirm ? <Text style={s.fieldError}>{errors.confirm}</Text> : null}

          <TouchableOpacity
            style={s.primaryBtn}
            onPress={handleRegister}
            disabled={loading}
            accessibilityLabel="Create account"
            accessibilityRole="button"
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.primaryBtnText}>Create Account</Text>
            }
          </TouchableOpacity>

          <View style={s.footer}>
            <Text style={s.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity accessibilityLabel="Sign in" accessibilityRole="link">
                <Text style={s.linkText}>Sign in</Text>
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
    header: { alignItems: 'center', marginBottom: 32 },
    logo: { fontSize: 48 },
    appName: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 8 },
    subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
    form: { gap: 2 },
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
      marginBottom: 8,
    },
    errorBannerText: { color: colors.danger, fontSize: 13 },
  });
