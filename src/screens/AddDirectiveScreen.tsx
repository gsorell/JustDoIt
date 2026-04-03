import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { addDays, format } from 'date-fns';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
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
import { windowLabel } from '../services/storage';
import { DirectiveType, RootStackParamList } from '../types';
import {
  colors,
  fontSizes,
  fontWeights,
  radius,
  spacing,
} from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AddDirective'>;

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Template {
  type: DirectiveType;
  action: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  defaultInterval: number;
  defaultDuration: number | null;
}

const TEMPLATES: Template[] = [
  { type: 'DO',   action: 'exercise',            icon: 'barbell-outline',   defaultInterval: 1440, defaultDuration: 90  },
  { type: 'DO',   action: 'meditate',            icon: 'leaf-outline',      defaultInterval: 1440, defaultDuration: null },
  { type: 'DO',   action: 'drink water',         icon: 'water-outline',     defaultInterval: 60,   defaultDuration: null },
  { type: 'DO',   action: 'read',                icon: 'book-outline',      defaultInterval: 1440, defaultDuration: 30  },
  { type: 'DO',   action: 'journal',             icon: 'pencil-outline',    defaultInterval: 1440, defaultDuration: null },
  { type: 'DONT', action: 'smoke',              icon: 'ban',               defaultInterval: 60,   defaultDuration: 30  },
  { type: 'DONT', action: 'vape',               icon: 'ban',               defaultInterval: 60,   defaultDuration: 30  },
  { type: 'DONT', action: 'drink alcohol',       icon: 'wine-outline',      defaultInterval: 1440, defaultDuration: 30  },
  { type: 'DONT', action: 'check social media',  icon: 'phone-portrait-outline', defaultInterval: 120, defaultDuration: null },
  { type: 'DONT', action: 'eat junk food',       icon: 'fast-food-outline', defaultInterval: 240,  defaultDuration: 90  },
];

interface IntervalOption { label: string; sublabel: string; value: number }
const INTERVAL_PRESETS: IntervalOption[] = [
  { label: '15 min',  sublabel: 'Very frequent',  value: 15   },
  { label: '30 min',  sublabel: 'Frequent',        value: 30   },
  { label: '1 hour',  sublabel: 'Hourly',          value: 60   },
  { label: '2 hours', sublabel: 'Bi-hourly',       value: 120  },
  { label: '4 hours', sublabel: 'Every half day',  value: 240  },
  { label: '12 hours',sublabel: 'Twice a day',     value: 720  },
  { label: 'Daily',   sublabel: 'Once a day',      value: 1440 },
  { label: 'Weekly',  sublabel: 'Once a week',     value: 10080},
];

interface DurationOption { label: string; sublabel: string; value: number | null }
const DURATION_PRESETS: DurationOption[] = [
  { label: 'Forever', sublabel: 'Open-ended',       value: null },
  { label: '1 day',   sublabel: 'Quick trial',      value: 1   },
  { label: '3 days',  sublabel: 'Short challenge',  value: 3   },
  { label: '7 days',  sublabel: '1-week sprint',    value: 7   },
  { label: '14 days', sublabel: '2-week push',      value: 14  },
  { label: '30 days', sublabel: '1-month challenge',value: 30  },
  { label: '90 days', sublabel: '3-month commitment',value: 90 },
  { label: '180 days',sublabel: '6-month journey',  value: 180 },
  { label: '1 year',  sublabel: 'Full-year goal',   value: 365 },
];

// Step 1+2 combined, step 2 = duration, step 3 = interval, step 4 = summary
const TOTAL_STEPS = 4;

// ─── Window preview component ─────────────────────────────────────────────────

function WindowPreview({ intervalMinutes, accentColor }: { intervalMinutes: number; accentColor: string }) {
  const dayMinutes = 1440;
  const weekMinutes = 10080;

  let totalMinutes: number;
  let label: string;

  if (intervalMinutes <= 1440) {
    totalMinutes = dayMinutes;
    label = 'in a day';
  } else {
    totalMinutes = weekMinutes;
    label = 'in a week';
  }

  const count = Math.floor(totalMinutes / intervalMinutes);
  const tiles = Math.min(count, 48); // cap rendering at 48

  return (
    <View style={previewStyles.container}>
      <Text style={previewStyles.label}>
        {count} window{count !== 1 ? 's' : ''} {label}
      </Text>
      <View style={previewStyles.row}>
        {Array.from({ length: tiles }).map((_, i) => (
          <View
            key={i}
            style={[
              previewStyles.tile,
              i === 0
                ? { backgroundColor: accentColor }
                : { backgroundColor: accentColor, opacity: 0.15 + (0.85 * (tiles - i)) / tiles },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const previewStyles = StyleSheet.create({
  container: {
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  tile: {
    width: 10,
    height: 18,
    borderRadius: 2,
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AddDirectiveScreen({ navigation }: Props) {
  const { addDirective } = useApp();

  const [step, setStep] = useState(1);
  const [type, setType] = useState<DirectiveType>('DO');
  const [action, setAction] = useState('');
  const [durationDays, setDurationDays] = useState<number | null>(null);
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [customIntervalText, setCustomIntervalText] = useState('');
  const [showCustomInterval, setShowCustomInterval] = useState(false);
  const [customDurationText, setCustomDurationText] = useState('');
  const [showCustomDuration, setShowCustomDuration] = useState(false);
  const [saving, setSaving] = useState(false);

  // Start / end date state
  // null startDate = "now"; null endDate = derive from durationDays (or forever)
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  // iOS / web: track which field the picker is editing + live value while dragging
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | null>(null);
  const [pickerValue, setPickerValue] = useState<Date>(new Date());

  const isDo = type === 'DO';
  const accentColor = isDo ? colors.do : colors.dont;
  const accentLight = isDo ? colors.doLight : colors.dontLight;

  const canNext =
    (step === 1 && action.trim().length > 0) ||
    step === 2 ||
    step === 3 ||
    step === 4;

  function applyTemplate(t: Template) {
    setType(t.type);
    setAction(t.action);
    setIntervalMinutes(t.defaultInterval);
    setDurationDays(t.defaultDuration);
    setStep(4); // jump straight to summary
  }

  function goBack() {
    if (step === 1) navigation.goBack();
    else setStep((s) => s - 1);
  }

  function commitCustomInterval() {
    const v = parseInt(customIntervalText, 10);
    if (!isNaN(v) && v > 0) {
      setIntervalMinutes(v);
      setShowCustomInterval(false);
      setCustomIntervalText('');
    }
  }

  function commitCustomDuration() {
    const v = parseInt(customDurationText, 10);
    if (!isNaN(v) && v > 0) {
      setDurationDays(v);
      setShowCustomDuration(false);
      setCustomDurationText('');
    }
  }

  function commitDate(target: 'start' | 'end', date: Date) {
    if (target === 'start') {
      setStartDate(date);
      // If the current endDate would be at or before the new startDate, clear it
      if (endDate && date >= endDate) setEndDate(null);
    } else {
      setEndDate(date);
      // Picking a specific end date clears any duration-days selection
      setDurationDays(null);
      setShowCustomDuration(false);
    }
    setPickerTarget(null);
  }

  function openDatePicker(target: 'start' | 'end') {
    const minDate = target === 'end' ? (startDate ?? new Date()) : new Date();
    const initial =
      target === 'start'
        ? (startDate ?? new Date())
        : (endDate ?? addDays(startDate ?? new Date(), 7));

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initial,
        mode: 'date',
        minimumDate: minDate,
        onChange: (_ev, datePart) => {
          if (!datePart) return;
          DateTimePickerAndroid.open({
            value: datePart,
            mode: 'time',
            onChange: (_ev2, timePart) => {
              if (!timePart) return;
              const combined = new Date(datePart);
              combined.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);
              commitDate(target, combined);
            },
          });
        },
      });
    } else {
      // iOS + web: show the modal/inline picker
      setPickerValue(initial);
      setPickerTarget(target);
    }
  }

  async function handleStart() {
    setSaving(true);
    try {
      await addDirective({
        type,
        action: action.trim(),
        durationDays,
        checkInIntervalMinutes: intervalMinutes,
        carryForward: true,
        startAt: startDate?.toISOString(),
        endAt: endDate?.toISOString(),
      });
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={goBack} hitSlop={8} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${(step / TOTAL_STEPS) * 100}%`, backgroundColor: accentColor },
              ]}
            />
          </View>
          <Text style={styles.stepLabel}>{step}/{TOTAL_STEPS}</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Step 1: Type + Action (combined) ── */}
          {step === 1 && (
            <>
              <Text style={styles.question}>What's your{'\n'}commitment?</Text>

              {/* Quick-start templates */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Quick start</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.templateRow}
              >
                {TEMPLATES.map((t) => (
                  <Pressable
                    key={`${t.type}-${t.action}`}
                    style={[
                      styles.templateChip,
                      { borderColor: t.type === 'DO' ? colors.do : colors.dont },
                    ]}
                    onPress={() => applyTemplate(t)}
                  >
                    <Ionicons
                      name={t.icon}
                      size={14}
                      color={t.type === 'DO' ? colors.do : colors.dont}
                    />
                    <Text
                      style={[
                        styles.templateChipText,
                        { color: t.type === 'DO' ? colors.do : colors.dont },
                      ]}
                    >
                      {t.action}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Type toggle */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Or build your own</Text>
              </View>
              <View style={styles.typeRow}>
                <Pressable
                  style={[
                    styles.typeCard,
                    type === 'DO' && { borderColor: colors.do, backgroundColor: colors.doLight },
                  ]}
                  onPress={() => setType('DO')}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={36}
                    color={type === 'DO' ? colors.do : colors.textMuted}
                  />
                  <Text style={[styles.typeLabel, type === 'DO' && { color: colors.do }]}>
                    Build It
                  </Text>
                  <Text style={styles.typeDesc}>Build a positive habit</Text>
                  {type === 'DO' && (
                    <View style={[styles.typeCheck, { backgroundColor: colors.do }]}>
                      <Ionicons name="checkmark" size={12} color={colors.background} />
                    </View>
                  )}
                </Pressable>

                <Pressable
                  style={[
                    styles.typeCard,
                    type === 'DONT' && { borderColor: colors.dont, backgroundColor: colors.dontLight },
                  ]}
                  onPress={() => setType('DONT')}
                >
                  <Ionicons
                    name="ban"
                    size={36}
                    color={type === 'DONT' ? colors.dont : colors.textMuted}
                  />
                  <Text style={[styles.typeLabel, type === 'DONT' && { color: colors.dont }]}>
                    Break It
                  </Text>
                  <Text style={styles.typeDesc}>Break a bad habit</Text>
                  {type === 'DONT' && (
                    <View style={[styles.typeCheck, { backgroundColor: colors.dont }]}>
                      <Ionicons name="checkmark" size={12} color={colors.background} />
                    </View>
                  )}
                </Pressable>
              </View>

              {/* Name input — inline below cards */}
              <TextInput
                style={[styles.textInput, { borderColor: action.trim() ? accentColor : colors.border }]}
                placeholder={isDo ? 'e.g. exercise, meditate, read…' : 'e.g. smoke, junk food…'}
                placeholderTextColor={colors.textMuted}
                value={action}
                onChangeText={setAction}
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => action.trim() && setStep(2)}
              />
            </>
          )}

          {/* ── Step 2: Start & Duration ── */}
          {step === 2 && (
            <>
              <Text style={styles.question}>When and{'\n'}for how long?</Text>

              {/* ── START section ── */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Starts</Text>
              </View>
              <View style={styles.startModeRow}>
                <Pressable
                  style={[
                    styles.startModeBtn,
                    !startDate && pickerTarget !== 'start' && { borderColor: accentColor, backgroundColor: accentLight },
                  ]}
                  onPress={() => { setStartDate(null); setPickerTarget(null); }}
                >
                  <Ionicons name="flash-outline" size={15} color={!startDate && pickerTarget !== 'start' ? accentColor : colors.textMuted} />
                  <Text style={[styles.startModeBtnLabel, !startDate && pickerTarget !== 'start' && { color: accentColor }]}>
                    Right now
                  </Text>
                  {!startDate && pickerTarget !== 'start' && (
                    <View style={[styles.startModeBtnCheck, { backgroundColor: accentColor }]}>
                      <Ionicons name="checkmark" size={11} color={colors.background} />
                    </View>
                  )}
                </Pressable>

                <Pressable
                  style={[
                    styles.startModeBtn,
                    (!!startDate || pickerTarget === 'start') && { borderColor: accentColor, backgroundColor: accentLight },
                  ]}
                  onPress={() => openDatePicker('start')}
                >
                  <Ionicons name="calendar-outline" size={15} color={!!startDate || pickerTarget === 'start' ? accentColor : colors.textMuted} />
                  <Text
                    style={[styles.startModeBtnLabel, (!!startDate || pickerTarget === 'start') && { color: accentColor }]}
                    numberOfLines={1}
                  >
                    {startDate ? format(startDate, 'MMM d, h:mm a') : 'Future date'}
                  </Text>
                  {(!!startDate || pickerTarget === 'start') && (
                    <View style={[styles.startModeBtnCheck, { backgroundColor: accentColor }]}>
                      <Ionicons name="checkmark" size={11} color={colors.background} />
                    </View>
                  )}
                </Pressable>
              </View>

              {/* Web inline start picker — single Set button inline with the input */}
              {Platform.OS === 'web' && pickerTarget === 'start' && (
                <View style={styles.webPickerBlock}>
                  <View style={styles.webPickerRow}>
                  {(React.createElement as any)('input', {
                    key: 'web-start-picker',
                    type: 'datetime-local',
                    autoFocus: true,
                    min: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
                    value: format(pickerValue, "yyyy-MM-dd'T'HH:mm"),
                    style: {
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: `2px solid ${accentColor}`,
                      backgroundColor: colors.card,
                      color: colors.text,
                      fontSize: 16,
                      flex: 1,
                      boxSizing: 'border-box',
                      outline: 'none',
                      colorScheme: 'dark',
                    },
                    onChange: (e: any) => {
                      const d = new Date(e.target.value);
                      if (!isNaN(d.getTime())) setPickerValue(d);
                    },
                  })}
                    <Pressable
                      style={[styles.webSetBtn, { backgroundColor: accentColor }]}
                      onPress={() => commitDate('start', pickerValue)}
                    >
                      <Text style={styles.webSetText}>Set</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* ── END section ── */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Ends</Text>
              </View>
              <View style={styles.optionList}>
                {DURATION_PRESETS.map((d) => {
                  const selected = endDate === null && !showCustomDuration && durationDays === d.value;
                  return (
                    <Pressable
                      key={String(d.value)}
                      style={[
                        styles.optionItem,
                        selected && { borderColor: accentColor, backgroundColor: accentLight },
                      ]}
                      onPress={() => {
                        setDurationDays(d.value);
                        setShowCustomDuration(false);
                        setEndDate(null);
                        setPickerTarget(null);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.optionText, selected && { color: accentColor }]}>
                          {d.label}
                        </Text>
                        <Text style={styles.optionSub}>{d.sublabel}</Text>
                      </View>
                      {selected && (
                        <View style={[styles.optionCheck, { backgroundColor: accentColor }]}>
                          <Ionicons name="checkmark" size={13} color={colors.background} />
                        </View>
                      )}
                    </Pressable>
                  );
                })}

                {/* Custom duration (days) */}
                <Pressable
                  style={[
                    styles.optionItem,
                    endDate === null && showCustomDuration && { borderColor: accentColor, backgroundColor: accentLight },
                  ]}
                  onPress={() => { setShowCustomDuration(true); setEndDate(null); setPickerTarget(null); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionText, endDate === null && showCustomDuration && { color: accentColor }]}>
                      Custom
                    </Text>
                    <Text style={styles.optionSub}>Enter any number of days</Text>
                  </View>
                  <Ionicons name="pencil-outline" size={16} color={colors.textMuted} />
                </Pressable>

                {showCustomDuration && endDate === null && (
                  <View style={styles.customInputRow}>
                    <TextInput
                      style={[styles.customInput, { borderColor: accentColor }]}
                      placeholder="e.g. 21"
                      placeholderTextColor={colors.textMuted}
                      value={customDurationText}
                      onChangeText={setCustomDurationText}
                      keyboardType="number-pad"
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={commitCustomDuration}
                    />
                    <Text style={styles.customInputUnit}>days</Text>
                    <Pressable
                      style={[styles.customConfirmBtn, { backgroundColor: accentColor }]}
                      onPress={commitCustomDuration}
                    >
                      <Ionicons name="checkmark" size={18} color={colors.background} />
                    </Pressable>
                  </View>
                )}

                {/* Specific end date & time */}
                <Pressable
                  style={[
                    styles.optionItem,
                    endDate !== null && { borderColor: accentColor, backgroundColor: accentLight },
                  ]}
                  onPress={() => openDatePicker('end')}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionText, endDate !== null && { color: accentColor }]}>
                      {endDate ? format(endDate, 'MMM d, yyyy · h:mm a') : 'Specific date & time'}
                    </Text>
                    <Text style={styles.optionSub}>
                      {endDate ? 'Tap to change' : 'Pick an exact end date'}
                    </Text>
                  </View>
                  {endDate !== null ? (
                    <View style={[styles.optionCheck, { backgroundColor: accentColor }]}>
                      <Ionicons name="checkmark" size={13} color={colors.background} />
                    </View>
                  ) : (
                    <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
                  )}
                </Pressable>

                {/* Web inline end picker — single Set button inline with the input */}
                {Platform.OS === 'web' && pickerTarget === 'end' && (
                  <View style={styles.webPickerBlock}>
                    <View style={styles.webPickerRow}>
                      {(React.createElement as any)('input', {
                        key: 'web-end-picker',
                        type: 'datetime-local',
                        autoFocus: true,
                        min: format(startDate ?? new Date(), "yyyy-MM-dd'T'HH:mm"),
                        value: format(pickerValue, "yyyy-MM-dd'T'HH:mm"),
                        style: {
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: `2px solid ${accentColor}`,
                          backgroundColor: colors.card,
                          color: colors.text,
                          fontSize: 16,
                          flex: 1,
                          boxSizing: 'border-box',
                          outline: 'none',
                          colorScheme: 'dark',
                        },
                        onChange: (e: any) => {
                          const d = new Date(e.target.value);
                          if (!isNaN(d.getTime())) setPickerValue(d);
                        },
                      })}
                      <Pressable
                        style={[styles.webSetBtn, { backgroundColor: accentColor }]}
                        onPress={() => commitDate('end', pickerValue)}
                      >
                        <Text style={styles.webSetText}>Set</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            </>
          )}

          {/* ── Step 3: Interval ── */}
          {step === 3 && (
            <>
              <Text style={styles.question}>How often should{'\n'}we check in?</Text>

              <WindowPreview intervalMinutes={intervalMinutes} accentColor={accentColor} />

              <View style={styles.optionList}>
                {INTERVAL_PRESETS.map((i) => {
                  const selected = !showCustomInterval && intervalMinutes === i.value;
                  return (
                    <Pressable
                      key={i.value}
                      style={[
                        styles.optionItem,
                        selected && { borderColor: accentColor, backgroundColor: accentLight },
                      ]}
                      onPress={() => { setIntervalMinutes(i.value); setShowCustomInterval(false); }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.optionText, selected && { color: accentColor }]}>
                          {i.label}
                        </Text>
                        <Text style={styles.optionSub}>{i.sublabel}</Text>
                      </View>
                      {selected && (
                        <View style={[styles.optionCheck, { backgroundColor: accentColor }]}>
                          <Ionicons name="checkmark" size={13} color={colors.background} />
                        </View>
                      )}
                    </Pressable>
                  );
                })}

                {/* Custom interval */}
                <Pressable
                  style={[
                    styles.optionItem,
                    showCustomInterval && { borderColor: accentColor, backgroundColor: accentLight },
                  ]}
                  onPress={() => setShowCustomInterval(true)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionText, showCustomInterval && { color: accentColor }]}>
                      Custom
                    </Text>
                    <Text style={styles.optionSub}>Enter any number of minutes</Text>
                  </View>
                  <Ionicons name="pencil-outline" size={16} color={colors.textMuted} />
                </Pressable>

                {showCustomInterval && (
                  <View style={styles.customInputRow}>
                    <TextInput
                      style={[styles.customInput, { borderColor: accentColor }]}
                      placeholder="e.g. 45"
                      placeholderTextColor={colors.textMuted}
                      value={customIntervalText}
                      onChangeText={setCustomIntervalText}
                      keyboardType="number-pad"
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={commitCustomInterval}
                    />
                    <Text style={styles.customInputUnit}>min</Text>
                    <Pressable
                      style={[styles.customConfirmBtn, { backgroundColor: accentColor }]}
                      onPress={commitCustomInterval}
                    >
                      <Ionicons name="checkmark" size={18} color={colors.background} />
                    </Pressable>
                  </View>
                )}
              </View>
            </>
          )}

          {/* ── Step 4: Summary ── */}
          {step === 4 && (
            <>
              <Text style={styles.question}>Ready to commit?</Text>
              <View style={[styles.summary, { borderColor: accentColor, backgroundColor: accentLight }]}>
                <View style={[styles.summaryStripe, { backgroundColor: accentColor }]} />
                <View style={styles.summaryContent}>
                  <View style={styles.summaryTypeRow}>
                    <Ionicons
                      name={isDo ? 'checkmark-circle' : 'ban'}
                      size={18}
                      color={accentColor}
                    />
                    <Text style={[styles.summaryType, { color: accentColor }]}>
                      {isDo ? 'BUILD IT' : 'BREAK IT'}
                    </Text>
                  </View>
                  <Text style={styles.summaryAction}>{action}</Text>
                  <View style={styles.summaryMeta}>
                    <View style={styles.summaryRow}>
                      <Ionicons name="play-circle-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.summaryMetaText}>
                        {startDate ? `Starts ${format(startDate, 'MMM d, h:mm a')}` : 'Starts now'}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Ionicons name="flag-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.summaryMetaText}>
                        {endDate
                          ? `Ends ${format(endDate, 'MMM d, yyyy · h:mm a')}`
                          : durationDays
                          ? `${durationDays} days`
                          : 'No end date'}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.summaryMetaText}>
                        {windowLabel(intervalMinutes)}
                      </Text>
                    </View>
                  </View>

                  {/* Tap to edit links */}
                  <View style={styles.editRow}>
                    <Pressable onPress={() => setStep(1)} style={styles.editLink}>
                      <Ionicons name="pencil-outline" size={12} color={colors.textMuted} />
                      <Text style={styles.editLinkText}>Edit commitment</Text>
                    </Pressable>
                    <Pressable onPress={() => setStep(2)} style={styles.editLink}>
                      <Ionicons name="pencil-outline" size={12} color={colors.textMuted} />
                      <Text style={styles.editLinkText}>Edit dates</Text>
                    </Pressable>
                    <Pressable onPress={() => setStep(3)} style={styles.editLink}>
                      <Ionicons name="pencil-outline" size={12} color={colors.textMuted} />
                      <Text style={styles.editLinkText}>Edit interval</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {step < 4 ? (
            <Pressable
              style={[
                styles.nextBtn,
                { backgroundColor: canNext ? accentColor : colors.surface },
              ]}
              onPress={() => setStep((s) => s + 1)}
              disabled={!canNext}
            >
              <Text style={[styles.nextBtnText, !canNext && { color: colors.textMuted }]}>
                Continue
              </Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color={canNext ? colors.background : colors.textMuted}
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
              <Ionicons name="checkmark-circle" size={18} color={colors.background} />
            </Pressable>
          )}
        </View>
        {/* iOS date/time picker — bottom sheet */}
        {Platform.OS === 'ios' && pickerTarget !== null && (
          <Modal transparent animationType="slide" visible onRequestClose={() => setPickerTarget(null)}>
            <Pressable style={pickerStyles.overlay} onPress={() => setPickerTarget(null)}>
              <Pressable style={pickerStyles.sheet} onPress={() => {}}>
                <View style={pickerStyles.handle} />
                <View style={pickerStyles.header}>
                  <Text style={pickerStyles.title}>
                    {pickerTarget === 'start' ? 'Set start' : 'Set end'}
                  </Text>
                  <Pressable
                    onPress={() => commitDate(pickerTarget, pickerValue)}
                    hitSlop={8}
                  >
                    <Text style={[pickerStyles.done, { color: accentColor }]}>Set</Text>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={pickerValue}
                  mode="datetime"
                  display="spinner"
                  textColor={colors.text}
                  minimumDate={pickerTarget === 'end' ? (startDate ?? new Date()) : new Date()}
                  onChange={(_, date) => { if (date) setPickerValue(date); }}
                  style={{ width: '100%' }}
                />
              </Pressable>
            </Pressable>
          </Modal>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: 4, borderRadius: 2 },
  stepLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
    minWidth: 24,
    textAlign: 'right',
  },

  content: { padding: spacing.md, paddingTop: spacing.lg, gap: spacing.md },

  question: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.black,
    color: colors.text,
    letterSpacing: -0.5,
    lineHeight: 32,
  },

  sectionHeader: { marginTop: spacing.xs },
  sectionLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    fontWeight: fontWeights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  templateRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    backgroundColor: colors.card,
  },
  templateChipText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },

  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeCard: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.card,
    position: 'relative',
  },
  typeLabel: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.black,
    color: colors.text,
    textAlign: 'center',
  },
  typeDesc: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  typeCheck: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 20,
    height: 20,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textInput: {
    borderWidth: 2,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSizes.lg,
    color: colors.text,
    fontWeight: fontWeights.semibold,
    backgroundColor: colors.card,
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
    backgroundColor: colors.card,
  },
  optionText: {
    fontSize: fontSizes.md,
    color: colors.text,
    fontWeight: fontWeights.medium,
  },
  optionSub: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  optionCheck: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },

  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  customInput: {
    flex: 1,
    borderWidth: 2,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: fontSizes.lg,
    color: colors.text,
    fontWeight: fontWeights.bold,
    backgroundColor: colors.card,
    textAlign: 'center',
  },
  customInputUnit: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
  customConfirmBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summary: {
    borderWidth: 2,
    borderRadius: radius.lg,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  summaryStripe: { width: 5 },
  summaryContent: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  summaryTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryType: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.black,
    letterSpacing: 1.5,
  },
  summaryAction: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.black,
    color: colors.text,
    letterSpacing: -1,
  },
  summaryMeta: { gap: spacing.xs, marginTop: spacing.xs },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryMetaText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  editRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  editLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  editLinkText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },

  footer: { padding: spacing.md, paddingBottom: spacing.lg },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nextBtnText: {
    color: colors.background,
    fontWeight: fontWeights.bold,
    fontSize: fontSizes.md,
  },

  // Web date picker block
  webPickerBlock: {
    gap: spacing.xs,
  },
  webPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  webSetBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  webSetText: {
    fontSize: fontSizes.sm,
    color: colors.background,
    fontWeight: fontWeights.bold,
  },

  // Start-mode toggle (two buttons side by side)
  startModeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  startModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    backgroundColor: colors.card,
    position: 'relative',
  },
  startModeBtnLabel: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
  startModeBtnCheck: {
    width: 18,
    height: 18,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─── iOS picker sheet styles ──────────────────────────────────────────────────

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.text,
    flex: 1,
  },
  done: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
  },
});
