import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { intervalLabel } from '../services/storage';
import { charmUnlockedAt, repCount } from '../services/charms';
import SuccessOverlay from '../components/SuccessOverlay';
import { Charm } from '../services/charms';
import { RootStackParamList } from '../types';
import {
  colors,
  fontSizes,
  fontWeights,
  radius,
  spacing,
} from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CheckIn'>;

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function CheckInScreen({ route, navigation }: Props) {
  const { directiveId, checkInId } = route.params;
  const { directives, checkIns, respondToCheckIn, pauseDirective, deleteDirective, addDirective, getStreak } =
    useApp();
  const directive = directives.find((d) => d.id === directiveId);

  const [showFailOptions, setShowFailOptions] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [newStreak, setNewStreak] = useState(0);
  const [unlockedCharm, setUnlockedCharm] = useState<Charm | null>(null);
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
      // Cumulative reps after this success — drives the charm check.
      const newReps = repCount(directiveId, checkIns) + 1;
      setUnlockedCharm(charmUnlockedAt(newReps) ?? null);

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
      <View style={[styles.tintOverlay, { backgroundColor: bgTint, pointerEvents: 'none' }]} />

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
            unlockedCharm={unlockedCharm}
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
