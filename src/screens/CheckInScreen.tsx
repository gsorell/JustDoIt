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
import { RootStackParamList } from '../types';
import { intervalLabel } from '../services/storage';
import { colors, fontSizes, fontWeights, radius, spacing } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CheckIn'>;

export default function CheckInScreen({ route, navigation }: Props) {
  const { directiveId, checkInId } = route.params;
  const { directives, respondToCheckIn, pauseDirective, deleteDirective, addDirective } = useApp();
  const directive = directives.find((d) => d.id === directiveId);

  const [showFailOptions, setShowFailOptions] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!directive) navigation.goBack();
  }, [directive]);

  if (!directive) return null;

  const isDo = directive.type === 'DO';
  const accentColor = isDo ? colors.do : colors.dont;
  const label = intervalLabel(directive.checkInIntervalMinutes);

  const question = isDo
    ? `Did you "${directive.action}" in the last ${label}?`
    : `Did you avoid "${directive.action}" for the last ${label}?`;

  async function handleYes() {
    setSaving(true);
    try {
      await respondToCheckIn(checkInId, 'success');
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }

  async function handleNo() {
    await respondToCheckIn(checkInId, 'failure');
    setShowFailOptions(true);
  }

  async function handleStartFresh() {
    setShowFailOptions(false);
    // Re-activate & schedule a new interval — the directive is already active;
    // the context will schedule a new check-in on the next respondToCheckIn success.
    // We just need to kick off a new pending check-in.
    await addDirective({
      type: directive!.type,
      action: directive!.action,
      durationDays: directive!.durationDays,
      checkInIntervalMinutes: directive!.checkInIntervalMinutes,
      carryForward: directive!.carryForward,
    });
    // Delete the old one to avoid duplicates
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
      {/* Close */}
      <Pressable style={styles.closeBtn} onPress={() => navigation.goBack()} hitSlop={8}>
        <Ionicons name="close" size={24} color={colors.textSecondary} />
      </Pressable>

      <View style={styles.body}>
        {/* Badge */}
        <View style={[styles.badge, { backgroundColor: isDo ? colors.doLight : colors.dontLight }]}>
          <Text style={[styles.badgeText, { color: accentColor }]}>
            {isDo ? 'JUST DO IT' : "JUST DON'T"}
          </Text>
        </View>

        {/* Question */}
        <Text style={styles.question}>{question}</Text>
      </View>

      {/* Buttons */}
      <View style={styles.btnRow}>
        <Pressable
          style={[styles.btn, styles.noBtn]}
          onPress={handleNo}
          disabled={saving}
        >
          <Text style={styles.noBtnText}>No ❌</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, { backgroundColor: accentColor, opacity: saving ? 0.7 : 1 }]}
          onPress={handleYes}
          disabled={saving}
        >
          <Text style={styles.yesBtnText}>Yes ✅</Text>
        </Pressable>
      </View>

      {/* Failure options modal */}
      <Modal
        visible={showFailOptions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFailOptions(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setShowFailOptions(false)}
        />
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>That's okay. What now?</Text>

          <Pressable style={[styles.sheetOption, styles.sheetOptionPrimary]} onPress={handleStartFresh}>
            <Ionicons name="refresh" size={22} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetOptionLabel, { color: colors.accent }]}>Start fresh</Text>
              <Text style={styles.sheetOptionDesc}>
                Reset the clock — new {intervalLabel(directive.checkInIntervalMinutes)} window starts now.
              </Text>
            </View>
          </Pressable>

          <Pressable style={styles.sheetOption} onPress={handlePause}>
            <Ionicons name="pause-circle-outline" size={22} color={colors.text} />
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetOptionLabel}>Pause for now</Text>
              <Text style={styles.sheetOptionDesc}>
                Stop check-ins. You can resume whenever you're ready.
              </Text>
            </View>
          </Pressable>

          <Pressable style={styles.sheetOption} onPress={handleGiveUp}>
            <Ionicons name="trash-outline" size={22} color={colors.failure} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetOptionLabel, { color: colors.failure }]}>Give up on this one</Text>
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
  closeBtn: { position: 'absolute', top: 56, right: spacing.md, zIndex: 10 },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  badgeText: { fontSize: fontSizes.sm, fontWeight: fontWeights.black, letterSpacing: 1 },
  question: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.black,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  btn: {
    flex: 1,
    paddingVertical: spacing.md + 4,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noBtn: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  noBtnText: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.text },
  yesBtnText: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.white },

  // Failure sheet
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  sheetOptionPrimary: { backgroundColor: colors.accentLight },
  sheetOptionLabel: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  sheetOptionDesc: { fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 18 },
});
