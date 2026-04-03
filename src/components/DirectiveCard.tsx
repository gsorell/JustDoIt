import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { windowLabel } from '../services/storage';
import { Directive } from '../types';
import {
  colors,
  fontSizes,
  fontWeights,
  radius,
  shadows,
  spacing,
} from '../utils/theme';

interface Props {
  directive: Directive;
  onPress: () => void;
  onCheckIn: (checkInId: string) => void;
}

function elapsedProgressLabel(elapsedMin: number, totalMin: number): string {
  const e = Math.round(elapsedMin);
  if (totalMin <= 60) return `${e} / ${totalMin} min`;
  const eH = Math.floor(e / 60);
  const eM = e % 60;
  const tH = totalMin / 60;
  const elapsedStr = eH > 0 ? `${eH}h${eM > 0 ? ` ${eM}m` : ''}` : `${eM}m`;
  return `${elapsedStr} / ${tH}h`;
}

function computeProgress(
  dueNow: boolean,
  pending: { dueAt: string } | undefined,
  intervalMinutes: number,
): number {
  if (dueNow) return 1;
  if (!pending) return 0;
  const dueMs = new Date(pending.dueAt).getTime();
  const totalMs = intervalMinutes * 60 * 1000;
  const startMs = dueMs - totalMs;
  return Math.min(Math.max((Date.now() - startMs) / totalMs, 0), 1);
}

export default function DirectiveCard({ directive, onPress, onCheckIn }: Props) {
  const { getStreak, getDueCheckIn, getPendingCheckIn } = useApp();

  // Tick every second for the elapsed label
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1_000);
    return () => clearInterval(id);
  }, []);

  const streak = getStreak(directive.id);
  const dueNow = getDueCheckIn(directive.id);
  const pending = getPendingCheckIn(directive.id);
  const isPaused = !directive.active && !!directive.pausedAt;
  const hasStarted = !directive.startAt || new Date(directive.startAt).getTime() <= Date.now();

  const isDo = directive.type === 'DO';
  const accentColor = isDo ? colors.do : colors.dont;
  const accentGlow = isDo ? colors.doGlow : colors.dontGlow;

  // Elapsed label — updates every second
  const elapsedLabel = useMemo(() => {
    if (!pending || dueNow || !hasStarted) return null;
    const dueMs = new Date(pending.dueAt).getTime();
    const totalMs = directive.checkInIntervalMinutes * 60 * 1000;
    const startMs = dueMs - totalMs;
    const elapsedMin = Math.max((Date.now() - startMs) / 60_000, 0);
    return elapsedProgressLabel(elapsedMin, directive.checkInIntervalMinutes);
  }, [pending, dueNow, hasStarted, directive.checkInIntervalMinutes, tick]);

  // ── Animated progress bar ──────────────────────────────────────────────────
  // We measure the track width, then animate a pixel value.
  const [trackWidth, setTrackWidth] = useState(0);
  const animatedWidth = useRef(new Animated.Value(0)).current;

  // Recompute target progress every second and animate toward it
  useEffect(() => {
    if (trackWidth === 0) return;
    const p = hasStarted ? computeProgress(!!dueNow, pending, directive.checkInIntervalMinutes) : 0;
    const barColor =
      p >= 0.9 ? colors.failure : p >= 0.75 ? colors.warning : accentColor;

    Animated.timing(animatedWidth, {
      toValue: p * trackWidth,
      duration: 1_000,       // glide over exactly one second — matches the tick
      useNativeDriver: false, // width is a layout prop, can't use native driver
    }).start();
  }, [tick, trackWidth, dueNow, pending, hasStarted, directive.checkInIntervalMinutes]);

  // Bar color derived from current progress (non-animated, changes per tick)
  const progress = hasStarted
    ? computeProgress(!!dueNow, pending, directive.checkInIntervalMinutes)
    : 0;
  const barColor =
    progress >= 0.9 ? colors.failure : progress >= 0.75 ? colors.warning : accentColor;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        dueNow && { backgroundColor: accentGlow, borderColor: accentColor },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      {/* Left accent stripe */}
      <View style={[styles.stripe, { backgroundColor: accentColor }]} />

      {/* Content */}
      <View style={styles.content}>
        {/* Top row: action + streak */}
        <View style={styles.topRow}>
          <Text style={styles.action} numberOfLines={2}>
            {directive.action}
          </Text>
          {streak > 0 && (
            <View style={[styles.streakPill, { backgroundColor: accentGlow }]}>
              <Text style={[styles.streakText, { color: accentColor }]}>
                🔥 {streak}
              </Text>
            </View>
          )}
        </View>

        {/* Meta row */}
        <View style={styles.metaRow}>
          <Text style={[styles.typeTag, { color: accentColor }]}>
            {isDo ? 'DO' : "DON'T"}
          </Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>
            {windowLabel(directive.checkInIntervalMinutes)}
          </Text>

          {!hasStarted && directive.startAt && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>Starts {format(parseISO(directive.startAt), 'MMM d, h:mm a')}</Text>
            </>
          )}

          {hasStarted && !dueNow && elapsedLabel && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>{elapsedLabel}</Text>
            </>
          )}

          {isPaused && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Ionicons name="pause-circle" size={12} color={colors.textMuted} />
              <Text style={styles.metaText}>paused</Text>
            </>
          )}

          {hasStarted && dueNow && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={[styles.dueLabel, { color: accentColor }]}>DUE NOW</Text>
            </>
          )}
        </View>

        {/* Animated progress bar */}
        {!isPaused && hasStarted && (
          <View
            style={styles.progressTrack}
            onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          >
            <Animated.View
              style={[
                styles.progressFill,
                { width: animatedWidth, backgroundColor: barColor },
              ]}
            />
          </View>
        )}

        {/* Check-in button when due */}
        {!isPaused && hasStarted && dueNow && (
          <Pressable
            style={[styles.checkInBtn, { backgroundColor: accentColor }]}
            onPress={() => onCheckIn(dueNow.id)}
          >
            <Ionicons name="flash" size={16} color={colors.background} />
            <Text style={styles.checkInBtnText}>Check in now</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  pressed: { opacity: 0.8 },
  stripe: { width: 4 },
  content: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  streakPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  streakText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  typeTag: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.black,
    letterSpacing: 0.8,
  },
  metaDot: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
  },
  metaText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  dueLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.black,
    letterSpacing: 0.8,
  },
  progressTrack: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
  },
  checkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  checkInBtnText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.black,
    color: colors.background,
    letterSpacing: 0.3,
  },
});
