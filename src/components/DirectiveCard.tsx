import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { Directive } from '../types';
import { intervalLabel } from '../services/storage';
import {
  colors,
  fontSizes,
  fontWeights,
  radius,
  shadows,
  spacing,
} from '../utils/theme';
import { formatDistanceToNowStrict } from 'date-fns';

interface Props {
  directive: Directive;
  onPress: () => void;
  onCheckIn: (checkInId: string) => void;
}

export default function DirectiveCard({ directive, onPress, onCheckIn }: Props) {
  const { getStreak, getDueCheckIn, getPendingCheckIn } = useApp();
  const streak = getStreak(directive.id);
  const dueNow = getDueCheckIn(directive.id);
  const pending = getPendingCheckIn(directive.id);
  const isPaused = !directive.active && !!directive.pausedAt;

  const isDo = directive.type === 'DO';
  const accentColor = isDo ? colors.do : colors.dont;
  const accentLightColor = isDo ? colors.doLight : colors.dontLight;

  const nextCheckInLabel = pending
    ? dueNow
      ? 'Due now'
      : `in ${formatDistanceToNowStrict(new Date(pending.dueAt))}`
    : null;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
    >
      {/* Type badge */}
      <View style={[styles.badge, { backgroundColor: accentLightColor }]}>
        <Text style={[styles.badgeText, { color: accentColor }]}>
          {isDo ? 'DO' : "DON'T"}
        </Text>
      </View>

      {/* Main content */}
      <View style={styles.body}>
        <Text style={styles.action} numberOfLines={2}>
          {directive.action}
        </Text>

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons name="flame" size={14} color={colors.warning} />
            <Text style={styles.metaText}>
              {streak} {streak === 1 ? 'check-in' : 'check-ins'}
            </Text>
          </View>

          <Text style={styles.dot}>·</Text>

          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>
              every {intervalLabel(directive.checkInIntervalMinutes)}
            </Text>
          </View>

          {isPaused && (
            <>
              <Text style={styles.dot}>·</Text>
              <View style={styles.metaItem}>
                <Ionicons name="pause-circle-outline" size={14} color={colors.textMuted} />
                <Text style={styles.metaText}>paused</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Check-in button or countdown */}
      {!isPaused && (
        <View style={styles.right}>
          {dueNow ? (
            <Pressable
              style={[styles.checkInBtn, { backgroundColor: accentColor }]}
              onPress={() => onCheckIn(dueNow.id)}
              hitSlop={4}
            >
              <Text style={styles.checkInBtnText}>Check in</Text>
            </Pressable>
          ) : nextCheckInLabel ? (
            <Text style={styles.countdown}>{nextCheckInLabel}</Text>
          ) : null}
        </View>
      )}

      <Ionicons
        name="chevron-forward"
        size={18}
        color={colors.border}
        style={styles.chevron}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.85 },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
    minWidth: 52,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.black,
    letterSpacing: 0.5,
  },
  body: { flex: 1 },
  action: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: 4,
  },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: fontSizes.xs, color: colors.textSecondary },
  dot: { color: colors.textMuted, fontSize: fontSizes.xs },
  right: { alignItems: 'flex-end', gap: spacing.xs },
  checkInBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  checkInBtnText: {
    color: colors.white,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
  },
  countdown: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textAlign: 'right',
  },
  chevron: { marginLeft: -4 },
});
