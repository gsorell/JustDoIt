import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format, parseISO } from 'date-fns';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { CheckIn, RootStackParamList } from '../types';
import { intervalLabel } from '../services/storage';
import { colors, fontSizes, fontWeights, radius, spacing } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DirectiveDetail'>;

export default function DirectiveDetailScreen({ route, navigation }: Props) {
  const { directiveId } = route.params;
  const {
    directives,
    checkIns,
    getStreak,
    pauseDirective,
    resumeDirective,
    deleteDirective,
  } = useApp();

  const directive = directives.find((d) => d.id === directiveId);
  const directiveCheckIns = checkIns
    .filter((c) => c.directiveId === directiveId && c.response !== 'pending')
    .sort(
      (a, b) =>
        new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime()
    );

  useEffect(() => {
    if (!directive) navigation.goBack();
  }, [directive]);

  if (!directive) return null;

  const streak = getStreak(directiveId);
  const isDo = directive.type === 'DO';
  const isPaused = !directive.active && !!directive.pausedAt;
  const accentColor = isDo ? colors.do : colors.dont;

  function confirmDelete() {
    Alert.alert(
      'Delete directive',
      `Remove "${directive!.action}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteDirective(directiveId);
            navigation.goBack();
          },
        },
      ]
    );
  }

  function responseIcon(response: CheckIn['response']) {
    if (response === 'success') return { name: 'checkmark-circle' as const, color: colors.success };
    if (response === 'failure') return { name: 'close-circle' as const, color: colors.failure };
    return { name: 'remove-circle-outline' as const, color: colors.textMuted };
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Pressable onPress={confirmDelete} hitSlop={8}>
          <Ionicons name="trash-outline" size={22} color={colors.failure} />
        </Pressable>
      </View>

      {/* Card */}
      <View style={[styles.card, { borderColor: accentColor }]}>
        <View style={[styles.badge, { backgroundColor: isDo ? colors.doLight : colors.dontLight }]}>
          <Text style={[styles.badgeText, { color: accentColor }]}>
            {isDo ? 'JUST DO IT' : "JUST DON'T"}
          </Text>
        </View>
        <Text style={styles.action}>{directive.action}</Text>

        <View style={styles.metaRow}>
          <MetaChip
            icon="time-outline"
            label={`every ${intervalLabel(directive.checkInIntervalMinutes)}`}
          />
          <MetaChip
            icon="calendar-outline"
            label={directive.durationDays ? `${directive.durationDays} days` : 'forever'}
          />
          {isPaused && <MetaChip icon="pause-circle-outline" label="paused" />}
        </View>

        {/* Streak */}
        <View style={styles.streakBox}>
          <Text style={[styles.streakNumber, { color: accentColor }]}>{streak}</Text>
          <Text style={styles.streakLabel}>consecutive successes</Text>
        </View>

        {/* Pause / Resume */}
        {isPaused ? (
          <Pressable
            style={[styles.actionBtn, { backgroundColor: accentColor }]}
            onPress={() => resumeDirective(directiveId)}
          >
            <Ionicons name="play" size={18} color={colors.white} />
            <Text style={styles.actionBtnText}>Resume</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.actionBtn, styles.pauseBtn]}
            onPress={() => pauseDirective(directiveId)}
          >
            <Ionicons name="pause" size={18} color={colors.textSecondary} />
            <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Pause</Text>
          </Pressable>
        )}
      </View>

      {/* History */}
      <Text style={styles.historyTitle}>Check-in history</Text>
      {directiveCheckIns.length === 0 ? (
        <Text style={styles.noHistory}>No check-ins yet.</Text>
      ) : (
        <FlatList
          data={directiveCheckIns}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.historyList}
          renderItem={({ item }) => {
            const icon = responseIcon(item.response);
            return (
              <View style={styles.historyRow}>
                <Ionicons name={icon.name} size={20} color={icon.color} />
                <Text style={styles.historyDate}>
                  {item.respondedAt
                    ? format(parseISO(item.respondedAt), 'MMM d, h:mm a')
                    : format(parseISO(item.dueAt), 'MMM d, h:mm a')}
                </Text>
                <Text style={[styles.historyStatus, { color: icon.color }]}>
                  {item.response}
                </Text>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

function MetaChip({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  return (
    <View style={chipStyles.chip}>
      <Ionicons name={icon} size={13} color={colors.textSecondary} />
      <Text style={chipStyles.label}>{label}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  label: { fontSize: fontSizes.xs, color: colors.textSecondary },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  card: {
    margin: spacing.md,
    borderWidth: 2,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  badgeText: { fontSize: fontSizes.xs, fontWeight: fontWeights.black, letterSpacing: 0.5 },
  action: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.black,
    color: colors.text,
    letterSpacing: -1,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  streakBox: { alignItems: 'center', paddingVertical: spacing.sm },
  streakNumber: { fontSize: fontSizes.xxxl, fontWeight: fontWeights.black },
  streakLabel: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: -4 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.full,
    paddingVertical: spacing.sm + 4,
    marginTop: spacing.xs,
  },
  pauseBtn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  actionBtnText: { color: colors.white, fontWeight: fontWeights.semibold, fontSize: fontSizes.md },
  historyTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  noHistory: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
  },
  historyList: { paddingHorizontal: spacing.md, gap: spacing.xs },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyDate: { flex: 1, fontSize: fontSizes.sm, color: colors.textSecondary },
  historyStatus: { fontSize: fontSizes.sm, fontWeight: fontWeights.medium, textTransform: 'capitalize' },
});
