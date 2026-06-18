import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { windowLabel } from '../services/storage';
import { windowStartMs } from '../services/scheduling';
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
}

function elapsedProgressLabel(elapsedMin: number, totalMin: number): string {
  const e = Math.round(elapsedMin);
  if (totalMin <= 60) return `${e} / ${Math.round(totalMin)} min`;
  const eH = Math.floor(e / 60);
  const eM = e % 60;
  const tH = Math.round((totalMin / 60) * 10) / 10;
  const elapsedStr = eH > 0 ? `${eH}h${eM > 0 ? ` ${eM}m` : ''}` : `${eM}m`;
  return `${elapsedStr} / ${tH}h`;
}

function computeProgress(dueNow: boolean, startMs: number, dueMs: number): number {
  if (dueNow) return 1;
  if (!dueMs) return 0;
  const total = dueMs - startMs;
  if (total <= 0) return 1;
  return Math.min(Math.max((Date.now() - startMs) / total, 0), 1);
}

export default function DirectiveCard({ directive, onPress }: Props) {
  const { getStreak, getDueCheckIn, getPendingCheckIn, quickCheckIn, checkIns } = useApp();

  // Tick every second for the elapsed label
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1_000);
    return () => clearInterval(id);
  }, []);

  // Inline check-in — records quietly and advances, no navigation.
  const [saving, setSaving] = useState(false);
  const handleQuickCheckIn = async (
    checkInId: string,
    response: 'success' | 'failure'
  ) => {
    if (saving) return;
    setSaving(true);
    try {
      await quickCheckIn(checkInId, response);
    } finally {
      setSaving(false);
    }
  };

  const streak = getStreak(directive.id);
  const dueNow = getDueCheckIn(directive.id);
  const pending = getPendingCheckIn(directive.id);
  const isPaused = !directive.active && !!directive.pausedAt;
  const hasStarted = !directive.startAt || new Date(directive.startAt).getTime() <= Date.now();

  const isDo = directive.type === 'DO';
  const accentColor = isDo ? colors.do : colors.dont;
  const accentGlow = isDo ? colors.doGlow : colors.dontGlow;

  // True window bounds — span may exceed one interval (deferred past quiet hours,
  // anchored, or extended after a late response).
  const dueMs = pending ? new Date(pending.dueAt).getTime() : 0;
  const startMs = pending ? windowStartMs(directive, dueMs, checkIns) : 0;

  // Elapsed label — updates every second
  const elapsedLabel = useMemo(() => {
    if (!pending || dueNow || !hasStarted) return null;
    const totalMs = dueMs - startMs;
    if (totalMs <= 0) return null;
    const elapsedMin = Math.max((Date.now() - startMs) / 60_000, 0);
    return elapsedProgressLabel(elapsedMin, totalMs / 60_000);
  }, [pending, dueNow, hasStarted, startMs, dueMs, tick]);

  // ── Animated progress bar ──────────────────────────────────────────────────
  // We measure the track width, then animate a pixel value.
  const [trackWidth, setTrackWidth] = useState(0);
  const animatedWidth = useRef(new Animated.Value(0)).current;

  // Recompute target progress every second and animate toward it
  useEffect(() => {
    if (trackWidth === 0) return;
    const p = hasStarted ? computeProgress(!!dueNow, startMs, dueMs) : 0;

    Animated.timing(animatedWidth, {
      toValue: p * trackWidth,
      duration: 1_000,       // glide over exactly one second — matches the tick
      useNativeDriver: false, // width is a layout prop, can't use native driver
    }).start();
  }, [tick, trackWidth, dueNow, startMs, dueMs, hasStarted]);

  // Bar color derived from current progress (non-animated, changes per tick)
  const progress = hasStarted ? computeProgress(!!dueNow, startMs, dueMs) : 0;
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

        {/* Inline check-in buttons when due — pass / fail without leaving Home */}
        {!isPaused && hasStarted && dueNow && (
          <View style={styles.checkInRow}>
            <Pressable
              style={[styles.failBtn, saving && styles.btnDisabled]}
              onPress={() => handleQuickCheckIn(dueNow.id, 'failure')}
              disabled={saving}
            >
              <Ionicons name="close" size={16} color={colors.failure} />
              <Text style={styles.failBtnText}>
                {isDo ? "I didn't" : 'Slipped'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.passBtn, { backgroundColor: accentColor }, saving && styles.btnDisabled]}
              onPress={() => handleQuickCheckIn(dueNow.id, 'success')}
              disabled={saving}
            >
              <Ionicons name="checkmark" size={16} color={colors.background} />
              <Text style={styles.passBtnText}>
                {isDo ? 'I did it' : 'Resisted'}
              </Text>
            </Pressable>
          </View>
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
  checkInRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  btnDisabled: { opacity: 0.6 },
  passBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  passBtnText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.black,
    color: colors.background,
    letterSpacing: 0.3,
  },
  failBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,68,102,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,68,102,0.3)',
  },
  failBtnText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.failure,
    letterSpacing: 0.3,
  },
});
