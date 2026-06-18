import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import React, { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { formatTimeOfDay } from '../services/scheduling';
import { RootStackParamList } from '../types';
import { colors, fontSizes, fontWeights, radius, spacing } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const DEFAULT_START = 22 * 60;
const DEFAULT_END = 7 * 60;

function minutesToDate(minutes: number): Date {
  const d = new Date();
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
}

export default function SettingsScreen({ navigation }: Props) {
  const { settings, updateSettings } = useApp();

  const enabled = settings?.quietHoursEnabled ?? true;
  const startMin = settings?.quietStartMinutes ?? DEFAULT_START;
  const endMin = settings?.quietEndMinutes ?? DEFAULT_END;

  const [picker, setPicker] = useState<{ target: 'start' | 'end'; value: Date } | null>(null);

  function commit(target: 'start' | 'end', date: Date) {
    const minutes = date.getHours() * 60 + date.getMinutes();
    updateSettings(target === 'start' ? { quietStartMinutes: minutes } : { quietEndMinutes: minutes });
    setPicker(null);
  }

  function openPicker(target: 'start' | 'end') {
    const value = minutesToDate(target === 'start' ? startMin : endMin);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'time',
        onChange: (_ev, date) => {
          if (date) commit(target, date);
        },
      });
      return;
    }
    setPicker({ target, value });
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.nav}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.navTitle}>Settings</Text>
        <View style={styles.navBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Quiet hours</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Pause check-ins overnight</Text>
              <Text style={styles.rowSub}>
                No window comes due — and nothing auto-fails — while you're asleep.
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={(v) => updateSettings({ quietHoursEnabled: v })}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={colors.white}
            />
          </View>

          {enabled && (
            <>
              <View style={styles.divider} />
              <Pressable style={styles.timeRow} onPress={() => openPicker('start')}>
                <Ionicons name="moon-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.timeLabel}>Sleep starts</Text>
                <Text style={[styles.timeValue, { color: colors.accent }]}>
                  {formatTimeOfDay(startMin)}
                </Text>
              </Pressable>
              <Pressable style={styles.timeRow} onPress={() => openPicker('end')}>
                <Ionicons name="sunny-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.timeLabel}>Wake up</Text>
                <Text style={[styles.timeValue, { color: colors.accent }]}>
                  {formatTimeOfDay(endMin)}
                </Text>
              </Pressable>
            </>
          )}
        </View>

        <Text style={styles.note}>
          Any check-in that would land in your quiet hours is held until {formatTimeOfDay(endMin)},
          so the overnight stretch folds into a single window you resolve in the morning.
        </Text>
      </ScrollView>

      {/* iOS time picker */}
      {Platform.OS === 'ios' && picker && (
        <Modal transparent animationType="slide" visible onRequestClose={() => setPicker(null)}>
          <Pressable style={styles.overlay} onPress={() => setPicker(null)}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>
                  {picker.target === 'start' ? 'Sleep starts' : 'Wake up'}
                </Text>
                <Pressable onPress={() => commit(picker.target, picker.value)} hitSlop={8}>
                  <Text style={[styles.sheetDone, { color: colors.accent }]}>Set</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={picker.value}
                mode="time"
                display="spinner"
                textColor={colors.text}
                onChange={(_ev, date) => date && setPicker({ ...picker, value: date })}
                style={{ width: '100%' }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Web time picker */}
      {Platform.OS === 'web' && picker && (
        <Modal transparent animationType="fade" visible onRequestClose={() => setPicker(null)}>
          <Pressable style={styles.overlay} onPress={() => setPicker(null)}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <Text style={styles.sheetTitle}>
                {picker.target === 'start' ? 'Sleep starts' : 'Wake up'}
              </Text>
              {(React.createElement as any)('input', {
                type: 'time',
                autoFocus: true,
                value: format(picker.value, 'HH:mm'),
                style: {
                  width: '100%',
                  padding: '10px 12px',
                  marginTop: 12,
                  borderRadius: 8,
                  border: `2px solid ${colors.accent}`,
                  backgroundColor: colors.card,
                  color: colors.text,
                  fontSize: 16,
                  boxSizing: 'border-box',
                  colorScheme: 'dark',
                },
                onChange: (e: any) => {
                  const [hh, mm] = String(e.target.value || '').split(':').map((n: string) => parseInt(n, 10));
                  if (isNaN(hh) || isNaN(mm)) return;
                  const d = new Date(picker.value);
                  d.setHours(hh, mm, 0, 0);
                  setPicker({ ...picker, value: d });
                },
              })}
              <Pressable
                style={[styles.webSetBtn, { backgroundColor: colors.accent }]}
                onPress={() => commit(picker.target, picker.value)}
              >
                <Text style={styles.webSetText}>Set</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.black,
    color: colors.text,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    fontWeight: fontWeights.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  rowSub: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  timeLabel: {
    flex: 1,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  timeValue: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
  },
  note: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    paddingHorizontal: spacing.xs,
    marginTop: spacing.xs,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.black,
    color: colors.text,
  },
  sheetDone: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
  },
  webSetBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  webSetText: {
    color: colors.background,
    fontWeight: fontWeights.bold,
    fontSize: fontSizes.md,
  },
});
