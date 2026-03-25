import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import * as schema from './schema';
import migrations from '../drizzle/migrations';

const expo = openDatabaseSync('streakly.db', { enableChangeListener: true });

export const db = drizzle(expo, { schema });

/**
 * Hook to run pending migrations on app start.
 * Use in the root layout:
 *
 *   const { success, error } = useDrizzleMigrations();
 */
export function useDrizzleMigrations() {
  return useMigrations(db, migrations);
}

export { migrations };
