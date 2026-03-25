# 🔥 Streakly

A local-first habit tracking app built with Expo (React Native) and SQLite. Track habits, maintain streaks, set targets, and gain insights — all on-device with no backend required.

---

## Features

- **Today view** — daily progress card, quick-complete buttons, weather widget
- **Habits** — create, edit, pause, delete; grouped by category; swipe-to-delete
- **Insights** — bar/line/donut charts (daily/weekly/monthly), streak counters, target progress
- **Settings** — dark mode, configurable daily reminder notification, CSV export, demo data seed
- **Categories & Targets** — custom colour/icon categories; weekly or monthly habit targets with visual progress

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 55 (React Native + TypeScript) |
| Routing | expo-router v4 (file-based) |
| Database | expo-sqlite + Drizzle ORM |
| Charts | react-native-gifted-charts |
| Auth | Local SHA-256 hash via expo-crypto |
| Storage | AsyncStorage (session + preferences) |
| Notifications | expo-notifications |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (macOS) or Android Emulator, or Expo Go on a physical device

### Install

```bash
git clone <repo-url>
cd streakly
npm install
```

### Generate Database Migrations

```bash
npx drizzle-kit generate
```

### Start the Development Server

```bash
npx expo start
```

Scan the QR code with Expo Go (Android) or press `i` for iOS Simulator / `a` for Android Emulator.

---

## Environment Variables

Create a `.env` file in the project root (already included):

```env
EXPO_PUBLIC_WEATHER_API_URL=https://api.open-meteo.com
```

The weather widget uses [Open-Meteo](https://open-meteo.com) (free, no API key) and [ipapi.co](https://ipapi.co) for approximate location.

---

## Seed Demo Data

1. Open the app and log in (or register)
2. Go to **Settings → Data → Load Demo Data**
3. Restart the app

This loads 1 demo user (`jacob@example.com` / `password123`), 4 categories, 6 habits, and 65 days of realistic log history.

---

## Project Structure

```
streakly/
├── app/
│   ├── (auth)/          # Login & Register screens
│   ├── (app)/           # Tab screens: today, habits, insights, settings
│   ├── habits/          # [id].tsx (edit), new.tsx
│   ├── log/             # [habitId].tsx
│   ├── categories/      # [id].tsx, new.tsx
│   ├── targets/         # [id].tsx, new.tsx
│   └── _layout.tsx      # Root layout with migration gate + auth guard
├── components/
│   ├── FilterBar.tsx
│   ├── SkeletonLoader.tsx
│   ├── SwipeableRow.tsx
│   ├── TargetProgress.tsx
│   └── WeatherCard.tsx
├── constants/
│   ├── colours.ts       # Brand colour palette
│   └── theme.ts         # Light/dark color objects
├── context/
│   ├── AuthContext.tsx
│   └── ThemeContext.tsx
├── db/
│   ├── index.ts         # SQLite connection + migration runner
│   ├── schema.ts        # Drizzle table definitions
│   └── seed.ts          # Demo data seed script
├── drizzle/             # Auto-generated migration files
├── hooks/               # Custom React hooks (useHabits, useLogs, etc.)
└── utils/
    ├── date.ts           # Date helpers
    ├── streak.ts         # Streak calculators
    ├── csv.ts            # CSV export (original)
    ├── dateHelpers.ts    # Re-export shim
    ├── streakCalculator.ts
    └── csvExporter.ts    # CSV export with date range support
```

---

## CSV Export

Go to **Settings → Data → Export CSV**. Optionally enter a date range (`YYYY-MM-DD`) to filter logs. Exports all habit logs with habit name, category, metric type, value, and notes. File is shared via the native share sheet.

---

## License

MIT
