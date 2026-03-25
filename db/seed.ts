import * as Crypto from 'expo-crypto';
import { db } from './index';
import { users, categories, habits, habit_logs, targets } from './schema';

const uuid = () => Crypto.randomUUID();
const now = () => new Date().toISOString();

// Demo account: jacob@example.com / password123

function isoDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

export async function runSeed(): Promise<void> {
  const password_hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    'password123'
  );
  // Clear all data in FK-safe order
  await db.delete(habit_logs);
  await db.delete(targets);
  await db.delete(habits);
  await db.delete(categories);
  await db.delete(users);

  // ── Users ──────────────────────────────────────────────────────────────────
  const userId = uuid();
  await db.insert(users).values({
    id: userId,
    username: 'jacob',
    email: 'jacob@example.com',
    password_hash,
    avatar_colour: '#6366f1',
    created_at: now(),
  });

  // ── Categories ─────────────────────────────────────────────────────────────
  const catHealth = uuid();
  const catFitness = uuid();
  const catLearning = uuid();
  const catMindfulness = uuid();

  await db.insert(categories).values([
    { id: catHealth, user_id: userId, name: 'Health', colour: '#22c55e', icon: '🍎', created_at: now() },
    { id: catFitness, user_id: userId, name: 'Fitness', colour: '#f97316', icon: '🏃', created_at: now() },
    { id: catLearning, user_id: userId, name: 'Learning', colour: '#3b82f6', icon: '📚', created_at: now() },
    { id: catMindfulness, user_id: userId, name: 'Mindfulness', colour: '#a855f7', icon: '🧘', created_at: now() },
  ]);

  // ── Habits ─────────────────────────────────────────────────────────────────
  const habitWater = uuid();
  const habitRun = uuid();
  const habitRead = uuid();
  const habitMeditate = uuid();
  const habitPushups = uuid();
  const habitSleep = uuid();

  await db.insert(habits).values([
    {
      id: habitWater,
      user_id: userId,
      category_id: catHealth,
      name: 'Drink Water',
      description: 'Stay hydrated — aim for 8 glasses a day',
      metric_type: 'count',
      unit: 'glasses',
      is_active: true,
      created_at: now(),
    },
    {
      id: habitRun,
      user_id: userId,
      category_id: catFitness,
      name: 'Morning Run',
      description: 'Go for a run before breakfast',
      metric_type: 'boolean',
      unit: null,
      is_active: true,
      created_at: now(),
    },
    {
      id: habitRead,
      user_id: userId,
      category_id: catLearning,
      name: 'Read',
      description: 'Read books or articles',
      metric_type: 'count',
      unit: 'pages',
      is_active: true,
      created_at: now(),
    },
    {
      id: habitMeditate,
      user_id: userId,
      category_id: catMindfulness,
      name: 'Meditate',
      description: 'Morning meditation session',
      metric_type: 'boolean',
      unit: null,
      is_active: true,
      created_at: now(),
    },
    {
      id: habitPushups,
      user_id: userId,
      category_id: catFitness,
      name: 'Push-ups',
      description: 'Daily push-up sets',
      metric_type: 'count',
      unit: 'reps',
      is_active: true,
      created_at: now(),
    },
    {
      id: habitSleep,
      user_id: userId,
      category_id: catHealth,
      name: 'Early to Bed',
      description: 'In bed by 10:30pm',
      metric_type: 'boolean',
      unit: null,
      is_active: true,
      created_at: now(),
    },
  ]);

  // ── Targets ────────────────────────────────────────────────────────────────
  await db.insert(targets).values([
    // Water: 8 glasses/day → 56/week, 240/month
    { id: uuid(), habit_id: habitWater, user_id: userId, period: 'weekly', target_value: 56, category_id: null, created_at: now() },
    { id: uuid(), habit_id: habitWater, user_id: userId, period: 'monthly', target_value: 240, category_id: null, created_at: now() },
    // Run: 4 days/week, 16 days/month
    { id: uuid(), habit_id: habitRun, user_id: userId, period: 'weekly', target_value: 4, category_id: null, created_at: now() },
    { id: uuid(), habit_id: habitRun, user_id: userId, period: 'monthly', target_value: 16, category_id: null, created_at: now() },
    // Read: 30 pages/week, 120/month
    { id: uuid(), habit_id: habitRead, user_id: userId, period: 'weekly', target_value: 30, category_id: null, created_at: now() },
    { id: uuid(), habit_id: habitRead, user_id: userId, period: 'monthly', target_value: 120, category_id: null, created_at: now() },
    // Meditate: 5 days/week, 20 days/month
    { id: uuid(), habit_id: habitMeditate, user_id: userId, period: 'weekly', target_value: 5, category_id: null, created_at: now() },
    { id: uuid(), habit_id: habitMeditate, user_id: userId, period: 'monthly', target_value: 20, category_id: null, created_at: now() },
    // Push-ups: 200 reps/week, 800/month
    { id: uuid(), habit_id: habitPushups, user_id: userId, period: 'weekly', target_value: 200, category_id: null, created_at: now() },
    { id: uuid(), habit_id: habitPushups, user_id: userId, period: 'monthly', target_value: 800, category_id: null, created_at: now() },
    // Sleep: 6 days/week, 24 days/month
    { id: uuid(), habit_id: habitSleep, user_id: userId, period: 'weekly', target_value: 6, category_id: null, created_at: now() },
    { id: uuid(), habit_id: habitSleep, user_id: userId, period: 'monthly', target_value: 24, category_id: null, created_at: now() },
  ]);

  // ── Habit Logs (65 days) ───────────────────────────────────────────────────
  // Realistic patterns: not every day perfect, some streaks, some misses
  const logs: (typeof habit_logs.$inferInsert)[] = [];

  for (let day = 65; day >= 0; day--) {
    const date = isoDate(day);
    const ts = now();

    // Deterministic "randomness" based on day number to keep seed idempotent
    const r = (seed: number) => ((day * 31 + seed * 17) % 100) / 100;

    // Water: usually 6-9 glasses, miss ~10% of days
    if (r(1) > 0.1) {
      const glasses = 5 + Math.floor(r(2) * 5); // 5–9
      logs.push({ id: uuid(), habit_id: habitWater, user_id: userId, date, value: glasses, notes: null, created_at: ts });
    }

    // Morning Run: boolean, ~55% compliance, tends to cluster (streaks)
    const runStreak = Math.floor(day / 7) % 2 === 0; // alternating week pattern
    if (runStreak && r(3) > 0.25) {
      logs.push({ id: uuid(), habit_id: habitRun, user_id: userId, date, value: 1, notes: null, created_at: ts });
    } else if (!runStreak && r(3) > 0.6) {
      logs.push({ id: uuid(), habit_id: habitRun, user_id: userId, date, value: 1, notes: null, created_at: ts });
    }

    // Read: 10–45 pages, miss ~20% of days
    if (r(4) > 0.2) {
      const pages = 10 + Math.floor(r(5) * 36); // 10–45
      logs.push({ id: uuid(), habit_id: habitRead, user_id: userId, date, value: pages, notes: null, created_at: ts });
    }

    // Meditate: boolean, ~70% compliance
    if (r(6) > 0.3) {
      logs.push({ id: uuid(), habit_id: habitMeditate, user_id: userId, date, value: 1, notes: null, created_at: ts });
    }

    // Push-ups: 20–60 reps, miss ~15% of days
    if (r(7) > 0.15) {
      const reps = 20 + Math.floor(r(8) * 41); // 20–60
      logs.push({ id: uuid(), habit_id: habitPushups, user_id: userId, date, value: reps, notes: null, created_at: ts });
    }

    // Sleep early: boolean, ~65% compliance, worse on weekends
    const dayOfWeek = new Date(date).getDay(); // 0=Sun, 6=Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const sleepThreshold = isWeekend ? 0.55 : 0.3;
    if (r(9) > sleepThreshold) {
      logs.push({ id: uuid(), habit_id: habitSleep, user_id: userId, date, value: 1, notes: null, created_at: ts });
    }
  }

  // Insert in batches of 50 to stay within SQLite variable limits
  const BATCH = 50;
  for (let i = 0; i < logs.length; i += BATCH) {
    await db.insert(habit_logs).values(logs.slice(i, i + BATCH));
  }

  console.log(`[seed] Done — inserted ${logs.length} habit logs across 65 days.`);
}
