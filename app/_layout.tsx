import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { useDrizzleMigrations } from '../db';

function MigrationGate({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const { success, error } = useDrizzleMigrations();

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 24 }}>
        <Text style={{ color: colors.danger, fontSize: 16, textAlign: 'center' }}>
          Database error:{'\n'}{error.message}
        </Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const { colors } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === '(auth)';
    if (!user && !inAuth) {
      router.replace('/(auth)/login');
    } else if (user && inAuth) {
      router.replace('/(app)/today');
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
      <Stack.Screen
        name="habits/new"
        options={{ presentation: 'modal', headerShown: true, title: 'New Habit', headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.text }}
      />
      <Stack.Screen
        name="habits/[id]"
        options={{ headerShown: true, title: 'Habit', headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.text }}
      />
      <Stack.Screen
        name="log/[habitId]"
        options={{ presentation: 'modal', headerShown: true, title: 'Log Entry', headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.text }}
      />
      <Stack.Screen
        name="categories/new"
        options={{ presentation: 'modal', headerShown: true, title: 'New Category', headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.text }}
      />
      <Stack.Screen
        name="categories/[id]"
        options={{ presentation: 'modal', headerShown: true, title: 'Edit Category', headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.text }}
      />
      <Stack.Screen
        name="targets/new"
        options={{ presentation: 'modal', headerShown: true, title: 'New Target', headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.text }}
      />
      <Stack.Screen
        name="targets/[id]"
        options={{ presentation: 'modal', headerShown: true, title: 'Edit Target', headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.text }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <MigrationGate>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </MigrationGate>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
