import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { DirectiveType, RootStackParamList } from '../types';
import { intervalLabel } from '../services/storage';
import { colors, fontSizes, fontWeights, radius, spacing } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AddDirective'>;

const INTERVALS = [
  { label: '30 min', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: '4 hours', value: 240 },
  { label: 'Daily', value: 1440 },
];

const DURATIONS: { label: string; value: number | null }[] = [
  { label: 'Forever', value: null },
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];

const TOTAL_STEPS = 5;

export default function AddDirectiveScreen({ navigation }: Props) {
  const { addDirective } = useApp();

  const [step, setStep] = useState(1);
  const [type, setType] = useState<DirectiveType>('DO');
  const [action, setAction] = useState('');
  const [durationDays, setDurationDays] = useState<number | null>(null);
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [carryForward, setCarryForward] = useState(true);
  const [saving, setSaving] = useState(false);

  const canNext =
    (step === 1 && !!type) ||
    (step === 2 && action.trim().length > 0) ||
    step === 3 ||
    step === 4 ||
    step === 5;

  function goBack() {
    if (step === 1) navigation.goBack();
    else setStep((s) => s - 1);
  }

  async function handleStart() {
    setSaving(true);
    try {
      await addDirective({
        type,
        action: action.trim(),
        durationDays,
        checkInIntervalMinutes: intervalMinutes,
        carryForward,
      });
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }

  const isDo = type === 'DO';
  const accentColor = isDo ? colors.do : colors.dont;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={goBack} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.stepLabel}>
            Step {step} of {TOTAL_STEPS}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${(step / TOTAL_STEPS) * 100}%`, backgroundColor: accentColor },
            ]}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step 1: DO or DON'T */}
          {step === 1 && (
            <>
              <Text style={styles.question}>What kind of commitment?</Text>
              <View style={styles.typeRow}>
                <Pressable
                  style={[
                    styles.typeCard,
                    type === 'DO' && { borderColor: colors.do, backgroundColor: colors.doLight },
                  ]}
                  onPress={() => setType('DO')}
                >
                  <Text style={styles.typeEmoji}>✅</Text>
                  <Text style={[styles.typeLabel, type === 'DO' && { color: colors.do }]}>
                    Just DO it
                  </Text>
                  <Text style={styles.typeDesc}>Build a positive habit</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.typeCard,
                    type === 'DONT' && { borderColor: colors.dont, backgroundColor: colors.dontLight },
                  ]}
                  onPress={() => setType('DONT')}
                >
                  <Text style={styles.typeEmoji}>🚫</Text>
                  <Text style={[styles.typeLabel, type === 'DONT' && { color: colors.dont }]}>
                    Just DON'T
                  </Text>
                  <Text style={styles.typeDesc}>Break a bad habit</Text>
                </Pressable>
              </View>
            </>
          )}

          {/* Step 2: What? */}
          {step === 2 && (
            <>
              <Text style={styles.question}>
                {isDo ? 'What will you do?' : "What will you avoid?"}
              </Text>
              <Text style={styles.hint}>
                {isDo
                  ? 'e.g. "exercise", "meditate", "drink water"'
                  : 'e.g. "smoke", "junk food", "check social media"'}
              </Text>
              <TextInput
                style={[styles.textInput, { borderColor: accentColor }]}
                placeholder={isDo ? 'exercise daily' : 'smoke'}
                placeholderTextColor={colors.textMuted}
                value={action}
                onChangeText={setAction}
                autoFocus
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => action.trim() && setStep(3)}
              />
            </>
          )}

          {/* Step 3: Duration */}
          {step === 3 && (
            <>
              <Text style={styles.question}>For how long?</Text>
              <View style={styles.optionList}>
                {DURATIONS.map((d) => (
                  <Pressable
                    key={String(d.value)}
                    style={[
                      styles.optionItem,
                      durationDays === d.value && {
                        borderColor: accentColor,
                        backgroundColor: isDo ? colors.doLight : colors.dontLight,
                      },
                    ]}
                    onPress={() => setDurationDays(d.value)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        durationDays === d.value && { color: accentColor, fontWeight: fontWeights.bold },
                      ]}
                    >
                      {d.label}
                    </Text>
                    {durationDays === d.value && (
                      <Ionicons name="checkmark" size={18} color={accentColor} />
                    )}
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {/* Step 4: Check-in interval */}
          {step === 4 && (
            <>
              <Text style={styles.question}>How often should we check in?</Text>
              <View style={styles.optionList}>
                {INTERVALS.map((i) => (
                  <Pressable
                    key={i.value}
                    style={[
                      styles.optionItem,
                      intervalMinutes === i.value && {
                        borderColor: accentColor,
                        backgroundColor: isDo ? colors.doLight : colors.dontLight,
                      },
                    ]}
                    onPress={() => setIntervalMinutes(i.value)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        intervalMinutes === i.value && {
                          color: accentColor,
                          fontWeight: fontWeights.bold,
                        },
                      ]}
                    >
                      {i.label}
                    </Text>
                    {intervalMinutes === i.value && (
                      <Ionicons name="checkmark" size={18} color={accentColor} />
                    )}
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {/* Step 5: Summary */}
          {step === 5 && (
            <>
              <Text style={styles.question}>Ready to commit?</Text>
              <View style={[styles.summary, { borderColor: accentColor }]}>
                <View style={[styles.summaryBadge, { backgroundColor: isDo ? colors.doLight : colors.dontLight }]}>
                  <Text style={[styles.summaryBadgeText, { color: accentColor }]}>
                    {isDo ? 'JUST DO IT' : "JUST DON'T"}
                  </Text>
                </View>
                <Text style={styles.summaryAction}>{action}</Text>
                <View style={styles.summaryMeta}>
                  <Text style={styles.summaryMetaText}>
                    For:{' '}
                    <Text style={styles.summaryMetaValue}>
                      {durationDays ? `${durationDays} days` : 'forever'}
                    </Text>
                  </Text>
                  <Text style={styles.summaryMetaText}>
                    Check-ins:{' '}
                    <Text style={styles.summaryMetaValue}>
                      every {intervalLabel(intervalMinutes)}
                    </Text>
                  </Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {step < 5 ? (
            <Pressable
              style={[
                styles.nextBtn,
                { backgroundColor: canNext ? accentColor : colors.border },
              ]}
              onPress={() => setStep((s) => s + 1)}
              disabled={!canNext}
            >
              <Text style={[styles.nextBtnText, !canNext && { color: colors.textMuted }]}>
                Next
              </Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={canNext ? colors.white : colors.textMuted}
              />
            </Pressable>
          ) : (
            <Pressable
              style={[styles.nextBtn, { backgroundColor: accentColor, opacity: saving ? 0.7 : 1 }]}
              onPress={handleStart}
              disabled={saving}
            >
              <Text style={styles.nextBtnText}>
                {saving ? 'Starting…' : 'Start commitment'}
              </Text>
              <Ionicons name="checkmark" size={20} color={colors.white} />
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  stepLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
  progressTrack: {
    height: 3,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
    borderRadius: 2,
  },
  progressFill: { height: 3, borderRadius: 2 },
  content: { padding: spacing.md, paddingTop: spacing.lg, gap: spacing.md },
  question: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.black,
    color: colors.text,
    letterSpacing: -0.5,
  },
  hint: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: -spacing.xs },
  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeCard: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  typeEmoji: { fontSize: 36 },
  typeLabel: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.black,
    color: colors.text,
  },
  typeDesc: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 2,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSizes.lg,
    color: colors.text,
    fontWeight: fontWeights.semibold,
  },
  optionList: { gap: spacing.xs },
  optionItem: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionText: { fontSize: fontSizes.md, color: colors.text },
  summary: {
    borderWidth: 2,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  summaryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  summaryBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.black,
    letterSpacing: 1,
  },
  summaryAction: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.black,
    color: colors.text,
    letterSpacing: -1,
  },
  summaryMeta: { gap: 4, marginTop: spacing.xs },
  summaryMetaText: { fontSize: fontSizes.sm, color: colors.textSecondary },
  summaryMetaValue: { fontWeight: fontWeights.semibold, color: colors.text },
  footer: { padding: spacing.md, paddingBottom: spacing.lg },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
  },
  nextBtnText: {
    color: colors.white,
    fontWeight: fontWeights.bold,
    fontSize: fontSizes.md,
  },
});
