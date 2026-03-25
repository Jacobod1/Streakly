import React, { useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';

type Props = {
  children: React.ReactNode;
  onDelete: () => void;
  deleteLabel?: string;
};

export default function SwipeableRow({ children, onDelete, deleteLabel = 'Delete' }: Props) {
  const { colors } = useTheme();
  const swipeRef = useRef<Swipeable>(null);

  function handleDelete() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    swipeRef.current?.close();
    onDelete();
  }

  function renderRightActions(progress: Animated.AnimatedInterpolation<number>) {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [80, 0],
    });
    return (
      <Animated.View style={[s.deleteAction, { transform: [{ translateX }] }]}>
        <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} accessibilityLabel={deleteLabel}>
          <Text style={s.deleteText}>{deleteLabel}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  const s = styles(colors);

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
    >
      {children}
    </Swipeable>
  );
}

const styles = (colors: ReturnType<typeof import('../context/ThemeContext').useTheme>['colors']) =>
  StyleSheet.create({
    deleteAction: {
      justifyContent: 'center',
      alignItems: 'flex-end',
      marginBottom: 10,
    },
    deleteBtn: {
      backgroundColor: colors.danger,
      justifyContent: 'center',
      alignItems: 'center',
      width: 80,
      height: '100%',
      borderRadius: 12,
    },
    deleteText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  });
