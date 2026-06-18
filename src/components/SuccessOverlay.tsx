import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Charm } from '../services/charms';
import { colors, fontSizes, fontWeights, radius, spacing } from '../utils/theme';

// ─── Milestone copy ────────────────────────────────────────────────────────────

function streakHeadline(streak: number, isDo: boolean): string {
  if (streak === 1) return 'First one.\nThe hardest.';
  if (streak === 2) return 'Two in a row.\nKeep going.';
  if (streak === 3) return 'Three straight.\nMomentum building.';
  if (streak === 5) return 'Five in a row.\nYou\'re doing it.';
  if (streak === 10) return 'Ten straight.\nThis is becoming real.';
  if (streak === 15) return 'Fifteen.\nYou\'re not stopping.';
  if (streak === 20) return 'Twenty in a row.\nThis is a habit now.';
  if (streak === 25) return 'Twenty-five.\nYou\'re consistent.';
  if (streak === 30) return 'Thirty straight.\nOne month strong.';
  if (streak === 50) return 'Fifty.\nUnstoppable.';
  if (streak === 100) return 'One hundred.\nThis is who you are.';
  if (streak > 100) return 'Legendary.';
  if (streak > 50) return `${streak} and counting.\nNothing can stop you.`;
  if (streak > 30) return `${streak} straight.\nBuilt different.`;
  if (streak > 20) return `${streak} in a row.\nYou own this.`;
  if (streak > 10) return `${streak} straight.\nThis is becoming real.`;
  if (isDo) return `${streak} in a row.\nKeep showing up.`;
  return `${streak} windows clean.\nYou\'re resisting.`;
}

function formatCleanTime(totalMinutes: number): string {
  if (totalMinutes < 60) return `${Math.round(totalMinutes)} minutes`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours} hours`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (days < 7) return remHours > 0 ? `${days}d ${remHours}h` : `${days} days`;
  const weeks = Math.floor(days / 7);
  const remDays = days % 7;
  return remDays > 0 ? `${weeks}w ${remDays}d` : `${weeks} weeks`;
}

// ─── Success overlay ───────────────────────────────────────────────────────────

interface SuccessOverlayProps {
  streak: number;
  isDo: boolean;
  accentColor: string;
  action: string;
  unlockedCharm: Charm | null;
  cleanTimeMinutes: number | null;
  onDismiss: () => void;
}

export default function SuccessOverlay({
  streak,
  isDo,
  accentColor,
  action,
  unlockedCharm,
  cleanTimeMinutes,
  onDismiss,
}: SuccessOverlayProps) {
  const scale = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;

  const nativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    Animated.sequence([
      Animated.timing(bgOpacity, { toValue: 1, duration: 250, useNativeDriver: nativeDriver }),
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: nativeDriver }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: nativeDriver }),
      ]),
    ]).start();
  }, []);

  function handleShare() {
    const link = 'https://chunkitdoit.netlify.app/';
    let message: string;
    if (isDo) {
      message = streak === 1
        ? `Just checked in on "${action}" for the first time. Starting the streak. 🔥\n\n#Cadence — track your commitments: ${link}`
        : `${streak} check-ins in a row on "${action}". Building the habit. 🔥\n\n#Cadence — track your commitments: ${link}`;
    } else {
      const cleanStr = cleanTimeMinutes ? ` — ${formatCleanTime(cleanTimeMinutes)} total clean time` : '';
      message = streak === 1
        ? `Just completed my first clean window avoiding "${action}". The streak begins.${cleanStr} 💪\n\n#Cadence — track your commitments: ${link}`
        : `${streak} clean windows in a row avoiding "${action}"${cleanStr}. 💪\n\n#Cadence — track your commitments: ${link}`;
    }
    Share.share({ message });
  }

  const isMilestone = [1, 2, 3, 5, 10, 15, 20, 25, 30, 50, 100].includes(streak);
  const headline = streakHeadline(streak, isDo);

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Flood background */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: accentColor, opacity: bgOpacity, pointerEvents: 'none' }]}
      />

      <SafeAreaView style={styles.inner} edges={['top', 'bottom']}>
        {/* Streak number */}
        <Animated.View style={[styles.numberWrap, { opacity, transform: [{ scale }] }]}>
          <Text style={styles.streakNumber}>{streak}</Text>
          <Text style={styles.streakUnit}>
            {streak === 1 ? 'check-in' : 'in a row'}
          </Text>
        </Animated.View>

        {/* Headline */}
        <Animated.Text style={[styles.headline, { opacity }]}>
          {headline}
        </Animated.Text>

        {/* Clean time for DONT */}
        {!isDo && cleanTimeMinutes !== null && cleanTimeMinutes > 0 && (
          <Animated.View style={[styles.cleanTimeBlock, { opacity }]}>
            <Text style={styles.cleanTimeLabel}>total clean time</Text>
            <Text style={styles.cleanTimeValue}>
              {formatCleanTime(cleanTimeMinutes)}
            </Text>
          </Animated.View>
        )}

        {/* Charm unlocked — a habit-formation milestone with insight */}
        {unlockedCharm && (
          <Animated.View style={[styles.charmCard, { opacity }]}>
            <Text style={styles.charmGlyph}>{unlockedCharm.glyph}</Text>
            <Text style={styles.charmUnlockLabel}>Charm unlocked</Text>
            <Text style={styles.charmName}>{unlockedCharm.name}</Text>
            <Text style={styles.charmPhase}>{unlockedCharm.phase}</Text>
            <Text style={styles.charmInsight}>{unlockedCharm.insight}</Text>
          </Animated.View>
        )}

        {/* Milestone badge — only when no richer charm was unlocked */}
        {isMilestone && !unlockedCharm && (
          <Animated.View style={[styles.milestoneBadge, { opacity }]}>
            <Ionicons name="trophy" size={14} color={colors.background} />
            <Text style={styles.milestoneBadgeText}>Milestone reached</Text>
          </Animated.View>
        )}

        {/* Action buttons */}
        <Animated.View style={[styles.actions, { opacity }]}>
          <Pressable style={styles.shareBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={18} color={accentColor} />
            <Text style={[styles.shareBtnText, { color: accentColor }]}>
              Share this
            </Text>
          </Pressable>
          <Pressable style={styles.continueBtn} onPress={onDismiss}>
            <Text style={styles.continueBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.background} />
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  numberWrap: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  streakNumber: {
    fontSize: 96,
    fontWeight: fontWeights.black,
    color: colors.background,
    letterSpacing: -4,
    lineHeight: 96,
  },
  streakUnit: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.background,
    opacity: 0.7,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headline: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.black,
    color: colors.background,
    textAlign: 'center',
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  cleanTimeBlock: {
    alignItems: 'center',
    marginTop: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  cleanTimeLabel: {
    fontSize: fontSizes.xs,
    color: colors.background,
    opacity: 0.7,
    fontWeight: fontWeights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cleanTimeValue: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.black,
    color: colors.background,
    letterSpacing: -0.5,
  },
  charmCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
    gap: 3,
    maxWidth: 360,
  },
  charmGlyph: {
    fontSize: 40,
    marginBottom: 2,
  },
  charmUnlockLabel: {
    fontSize: fontSizes.xs,
    color: colors.background,
    opacity: 0.7,
    fontWeight: fontWeights.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  charmName: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.black,
    color: colors.background,
    letterSpacing: -0.5,
  },
  charmPhase: {
    fontSize: fontSizes.xs,
    color: colors.background,
    opacity: 0.7,
    fontWeight: fontWeights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  charmInsight: {
    fontSize: fontSizes.sm,
    color: colors.background,
    opacity: 0.92,
    textAlign: 'center',
    lineHeight: 19,
  },
  milestoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginTop: spacing.xs,
  },
  milestoneBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.background,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: radius.full,
    paddingVertical: spacing.sm + 4,
  },
  shareBtnText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: radius.full,
    paddingVertical: spacing.sm + 4,
  },
  continueBtnText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.background,
  },
});
