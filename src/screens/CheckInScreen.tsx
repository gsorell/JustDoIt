import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { intervalLabel } from '../services/storage';
import { RootStackParamList } from '../types';
import {
  colors,
  fontSizes,
  fontWeights,
  radius,
  spacing,
} from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CheckIn'>;

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
  cleanTimeMinutes: number | null;
  onDismiss: () => void;
}

function SuccessOverlay({ streak, isDo, accentColor, action, cleanTimeMinutes, onDismiss }: SuccessOverlayProps) {
  const scale = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(bgOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  function handleShare() {
    let message: string;
    if (isDo) {
      message = streak === 1
        ? `Just checked in on "${action}" for the first time. Starting the streak. 🔥 #Cadence`
        : `${streak} check-ins in a row on "${action}". Building the habit. 🔥 #Cadence`;
    } else {
      const cleanStr = cleanTimeMinutes ? ` — ${formatCleanTime(cleanTimeMinutes)} total clean time` : '';
      message = streak === 1
        ? `Just completed my first clean window avoiding "${action}". The streak begins.${cleanStr} 💪 #Cadence`
        : `${streak} clean windows in a row avoiding "${action}"${cleanStr}. 💪 #Cadence`;
    }
    Share.share({ message });
  }

  const isMilestone = [1, 2, 3, 5, 10, 15, 20, 25, 30, 50, 100].includes(streak);
  const headline = streakHeadline(streak, isDo);

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Flood background */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: accentColor, opacity: bgOpacity }]}
        pointerEvents="none"
      />

      <SafeAreaView style={successStyles.inner} edges={['top', 'bottom']}>
        {/* Streak number */}
        <Animated.View style={[successStyles.numberWrap, { opacity, transform: [{ scale }] }]}>
          <Text style={successStyles.streakNumber}>{streak}</Text>
          <Text style={successStyles.streakUnit}>
            {streak === 1 ? 'check-in' : 'in a row'}
          </Text>
        </Animated.View>

        {/* Headline */}
        <Animated.Text style={[successStyles.headline, { opacity }]}>
          {headline}
        </Animated.Text>

        {/* Clean time for DONT */}
        {!isDo && cleanTimeMinutes !== null && cleanTimeMinutes > 0 && (
          <Animated.View style={[successStyles.cleanTimeBlock, { opacity }]}>
            <Text style={successStyles.cleanTimeLabel}>total clean time</Text>
            <Text style={successStyles.cleanTimeValue}>
              {formatCleanTime(cleanTimeMinutes)}
            </Text>
          </Animated.View>
        )}

        {/* Milestone badge */}
        {isMilestone && (
          <Animated.View style={[successStyles.milestoneBadge, { opacity }]}>
            <Ionicons name="trophy" size={14} color={colors.background} />
            <Text style={successStyles.milestoneBadgeText}>Milestone reached</Text>
          </Animated.View>
        )}

        {/* Action buttons */}
        <Animated.View style={[successStyles.actions, { opacity }]}>
          <Pressable style={successStyles.shareBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={18} color={accentColor} />
            <Text style={[successStyles.shareBtnText, { color: accentColor }]}>
              Share this
            </Text>
          </Pressable>
          <Pressable style={successStyles.continueBtn} onPress={onDismiss}>
            <Text style={successStyles.continueBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.background} />
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const successStyles = StyleSheet.create({
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

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function CheckInScreen({ route, navigation }: Props) {
  const { directiveId, checkInId } = route.params;
  const { directives, checkIns, respondToCheckIn, pauseDirective, deleteDirective, addDirective, getStreak } =
    useApp();
  const directive = directives.find((d) => d.id === directiveId);

  const [showFailOptions, setShowFailOptions] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [newStreak, setNewStreak] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!directive) navigation.goBack();
  }, [directive]);

  if (!directive) return null;

  const isDo = directive.type === 'DO';
  const accentColor = isDo ? colors.do : colors.dont;
  const bgTint = isDo ? 'rgba(0,230,118,0.07)' : 'rgba(255,68,102,0.07)';
  const label = intervalLabel(directive.checkInIntervalMinutes);

  const question = isDo
    ? `Did you "${directive.action}" in the last ${label}?`
    : `Did you avoid "${directive.action}" for the last ${label}?`;

  // Cumulative clean time for DONT: count successful windows * interval duration
  const cleanTimeMinutes = !isDo
    ? checkIns
        .filter((c) => c.directiveId === directiveId && c.response === 'success')
        .length * directive.checkInIntervalMinutes
    : null;

  async function handleYes() {
    setSaving(true);
    try {
      await respondToCheckIn(checkInId, 'success');
      // Compute streak after response is saved
      const updatedStreak = getStreak(directiveId) + 1;
      setNewStreak(updatedStreak);
      setShowSuccess(true);
    } finally {
      setSaving(false);
    }
  }

  function handleSuccessDismiss() {
    setShowSuccess(false);
    navigation.goBack();
  }

  async function handleNo() {
    await respondToCheckIn(checkInId, 'failure');
    setShowFailOptions(true);
  }

  async function handleStartFresh() {
    setShowFailOptions(false);
    await addDirective({
      type: directive!.type,
      action: directive!.action,
      durationDays: directive!.durationDays,
      checkInIntervalMinutes: directive!.checkInIntervalMinutes,
      carryForward: directive!.carryForward,
    });
    await deleteDirective(directiveId);
    navigation.goBack();
  }

  async function handlePause() {
    setShowFailOptions(false);
    await pauseDirective(directiveId);
    navigation.goBack();
  }

  async function handleGiveUp() {
    setShowFailOptions(false);
    await deleteDirective(directiveId);
    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Subtle tint */}
      <View style={[styles.tintOverlay, { backgroundColor: bgTint }]} pointerEvents="none" />

      {/* Close */}
      <Pressable style={styles.closeBtn} onPress={() => navigation.goBack()} hitSlop={12}>
        <View style={styles.closeBtnInner}>
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </View>
      </Pressable>

      {/* Body */}
      <View style={styles.body}>
        <View style={[styles.badge, { borderColor: accentColor }]}>
          <Text style={[styles.badgeText, { color: accentColor }]}>
            {isDo ? 'DO IT' : "DON'T"}
          </Text>
        </View>
        <Text style={styles.question}>{question}</Text>
        <Text style={styles.hint}>Answer honestly. Every check-in counts.</Text>
      </View>

      {/* Buttons */}
      <View style={styles.btnArea}>
        <Pressable style={[styles.btn, styles.noBtn]} onPress={handleNo} disabled={saving}>
          <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
          <Text style={styles.noBtnText}>No</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, styles.yesBtn, { backgroundColor: accentColor, opacity: saving ? 0.7 : 1 }]}
          onPress={handleYes}
          disabled={saving}
        >
          <Ionicons name="checkmark-circle" size={28} color={colors.background} />
          <Text style={styles.yesBtnText}>{saving ? '…' : 'Yes'}</Text>
        </Pressable>
      </View>

      {/* Success overlay */}
      {showSuccess && (
        <View style={StyleSheet.absoluteFill}>
          <SuccessOverlay
            streak={newStreak}
            isDo={isDo}
            accentColor={accentColor}
            action={directive.action}
            cleanTimeMinutes={
              cleanTimeMinutes !== null
                ? cleanTimeMinutes + directive.checkInIntervalMinutes
                : null
            }
            onDismiss={handleSuccessDismiss}
          />
        </View>
      )}

      {/* Failure sheet */}
      <Modal
        visible={showFailOptions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFailOptions(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setShowFailOptions(false)} />
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>That's okay.</Text>
          <Text style={styles.sheetSubtitle}>What do you want to do next?</Text>

          <Pressable style={[styles.sheetOption, styles.sheetOptionAccent]} onPress={handleStartFresh}>
            <View style={[styles.sheetIconWrap, { backgroundColor: colors.accentLight }]}>
              <Ionicons name="refresh" size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetOptionLabel, { color: colors.accent }]}>Start fresh</Text>
              <Text style={styles.sheetOptionDesc}>
                Reset the clock — new {intervalLabel(directive.checkInIntervalMinutes)} window starts now.
              </Text>
            </View>
          </Pressable>

          <Pressable style={styles.sheetOption} onPress={handlePause}>
            <View style={[styles.sheetIconWrap, { backgroundColor: colors.surface }]}>
              <Ionicons name="pause" size={20} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetOptionLabel}>Pause for now</Text>
              <Text style={styles.sheetOptionDesc}>
                Stop check-ins. Resume whenever you're ready.
              </Text>
            </View>
          </Pressable>

          <Pressable style={styles.sheetOption} onPress={handleGiveUp}>
            <View style={[styles.sheetIconWrap, { backgroundColor: 'rgba(255,68,102,0.1)' }]}>
              <Ionicons name="trash-outline" size={20} color={colors.failure} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetOptionLabel, { color: colors.failure }]}>
                Give up on this one
              </Text>
              <Text style={styles.sheetOptionDesc}>Remove this directive entirely.</Text>
            </View>
          </Pressable>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tintOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },

  closeBtn: { position: 'absolute', top: 56, right: spacing.md, zIndex: 10 },
  closeBtnInner: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  badge: {
    borderWidth: 1.5,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.black,
    letterSpacing: 1.5,
  },
  question: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.black,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  hint: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },

  btnArea: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.xs,
  },
  noBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  noBtnText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  yesBtn: {},
  yesBtnText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.black,
    color: colors.background,
  },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  sheetHandle: {
    width: 36,
    height: 3,
    backgroundColor: colors.borderBright,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.black,
    color: colors.text,
    paddingHorizontal: spacing.xs,
  },
  sheetSubtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 4,
    borderRadius: radius.md,
  },
  sheetOptionAccent: { backgroundColor: colors.accentLight },
  sheetIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionLabel: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  sheetOptionDesc: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
