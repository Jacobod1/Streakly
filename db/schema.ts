import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  avatar_colour: text('avatar_colour').notNull().default('#6366f1'),
  created_at: text('created_at').notNull(),
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  colour: text('colour').notNull(),
  icon: text('icon').notNull(),
  created_at: text('created_at').notNull(),
});

export const habits = sqliteTable('habits', {
  id: text('id').primaryKey(),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  category_id: text('category_id')
    .notNull()
    .references(() => categories.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  metric_type: text('metric_type', { enum: ['boolean', 'count'] }).notNull(),
  unit: text('unit'),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  created_at: text('created_at').notNull(),
});

export const habit_logs = sqliteTable('habit_logs', {
  id: text('id').primaryKey(),
  habit_id: text('habit_id')
    .notNull()
    .references(() => habits.id, { onDelete: 'cascade' }),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  value: integer('value').notNull(),
  notes: text('notes'),
  created_at: text('created_at').notNull(),
});

export const targets = sqliteTable('targets', {
  id: text('id').primaryKey(),
  habit_id: text('habit_id')
    .notNull()
    .references(() => habits.id, { onDelete: 'cascade' }),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  period: text('period', { enum: ['weekly', 'monthly'] }).notNull(),
  target_value: integer('target_value').notNull(),
  category_id: text('category_id').references(() => categories.id, {
    onDelete: 'set null',
  }),
  created_at: text('created_at').notNull(),
});
