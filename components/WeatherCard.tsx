import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const WEATHER_BASE = process.env.EXPO_PUBLIC_WEATHER_API_URL ?? 'https://api.open-meteo.com';

type WeatherData = {
  temp: number;
  weatherCode: number;
  city: string;
};

function weatherLabel(code: number): { icon: string; label: string; outdoor: boolean } {
  if (code === 0) return { icon: '☀️', label: 'Clear sky', outdoor: true };
  if (code <= 2) return { icon: '⛅', label: 'Partly cloudy', outdoor: true };
  if (code === 3) return { icon: '☁️', label: 'Overcast', outdoor: true };
  if (code <= 49) return { icon: '🌫️', label: 'Foggy', outdoor: false };
  if (code <= 67) return { icon: '🌧️', label: 'Rainy', outdoor: false };
  if (code <= 77) return { icon: '❄️', label: 'Snowy', outdoor: false };
  if (code <= 82) return { icon: '🌦️', label: 'Showers', outdoor: false };
  return { icon: '⛈️', label: 'Stormy', outdoor: false };
}

export default function WeatherCard() {
  const { colors } = useTheme();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Get approximate location from IP
        const geoRes = await fetch('https://ipapi.co/json/');
        const geo = await geoRes.json();
        if (!geo.latitude || !geo.longitude) throw new Error('no geo');

        const url =
          `${WEATHER_BASE}/v1/forecast` +
          `?latitude=${geo.latitude}&longitude=${geo.longitude}` +
          `&current_weather=true`;

        const weatherRes = await fetch(url);
        const data = await weatherRes.json();
        if (cancelled) return;
        setWeather({
          temp: Math.round(data.current_weather.temperature),
          weatherCode: data.current_weather.weathercode,
          city: geo.city ?? geo.region ?? 'your area',
        });
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const s = styles(colors);

  if (error) return null; // Silent fail — weather is non-critical

  if (!weather) {
    return (
      <View style={s.card}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  const { icon, label, outdoor } = weatherLabel(weather.weatherCode);

  return (
    <View style={s.card} accessibilityLabel={`Weather: ${weather.temp}°C, ${label} in ${weather.city}`}>
      <View style={s.left}>
        <Text style={s.icon}>{icon}</Text>
        <View>
          <Text style={s.temp}>{weather.temp}°C</Text>
          <Text style={s.label}>{label} · {weather.city}</Text>
        </View>
      </View>
      {outdoor && (
        <View style={s.badge}>
          <Text style={s.badgeText}>Great day for outdoor habits!</Text>
        </View>
      )}
    </View>
  );
}

const styles = (colors: ReturnType<typeof import('../context/ThemeContext').useTheme>['colors']) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.primaryLight,
      borderRadius: 14,
      padding: 14,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 56,
    },
    left: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    icon: { fontSize: 28 },
    temp: { fontSize: 16, fontWeight: '700', color: colors.primary },
    label: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
    badge: { backgroundColor: colors.primary + '22', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    badgeText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  });
