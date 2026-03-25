import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users, categories, habits, habit_logs, targets } from '../db/schema';

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  avatar_colour: string;
};

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);
const SESSION_KEY = 'streakly_user_id';

export async function hashPassword(password: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const userId = await AsyncStorage.getItem(SESSION_KEY);
      if (userId) {
        const [found] = await db.select().from(users).where(eq(users.id, userId));
        if (found) {
          setUser({ id: found.id, username: found.username, email: found.email, avatar_colour: found.avatar_colour });
        } else {
          await AsyncStorage.removeItem(SESSION_KEY);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const normalised = email.toLowerCase().trim();
    const hash = await hashPassword(password);
    const [found] = await db.select().from(users).where(eq(users.email, normalised));
    if (!found || found.password_hash !== hash) {
      throw new Error('Invalid email or password');
    }
    await AsyncStorage.setItem(SESSION_KEY, found.id);
    setUser({ id: found.id, username: found.username, email: found.email, avatar_colour: found.avatar_colour });
  }

  async function register(username: string, email: string, password: string) {
    const normalised = email.toLowerCase().trim();
    const [existing] = await db.select().from(users).where(eq(users.email, normalised));
    if (existing) throw new Error('An account with that email already exists');

    const hash = await hashPassword(password);
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(users).values({
      id,
      username: username.trim(),
      email: normalised,
      password_hash: hash,
      avatar_colour: '#6366f1',
      created_at: now,
    });

    await AsyncStorage.setItem(SESSION_KEY, id);
    setUser({ id, username: username.trim(), email: normalised, avatar_colour: '#6366f1' });
  }

  async function logout() {
    await AsyncStorage.removeItem(SESSION_KEY);
    setUser(null);
  }

  async function deleteAccount() {
    if (!user) return;
    // FK cascades handle children; delete user directly
    await db.delete(users).where(eq(users.id, user.id));
    await AsyncStorage.removeItem(SESSION_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
