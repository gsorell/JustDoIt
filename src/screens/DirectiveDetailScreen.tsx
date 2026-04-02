import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format, parseISO } from 'date-fns';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { windowLabel } from '../services/storage';
import { CheckIn, RootStackParamList } from '../types';
import {
  colors,
  fontSizes,
  fontWeights,
  radius,
  shadows,
  spacing,
} from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DirectiveDetail'>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const totalSec = Math.floor(Math.max(ms, 0) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) return `${h}h ${pad(m)}m ${pad(s)}s`;
  if (m > 0) return `${m}m ${pad(s)}s`;
  return `${s}s`;
}

// ─── Window strip ─────────────────────────────────────────────────────────────

interface WindowStripProps {
  pastCheckIns: CheckIn[];       // sorted oldest → newest
  windowProgress: number;        // 0–1
  hasPending: boolean;
  accentColor: string;
}

function WindowStrip({ pastCheckIns, windowProgress, hasPending, accentColor }: WindowStripProps) {
  const scrollRef = useRef<ScrollView>(null);

  // Auto-scroll to end so the active window is always visible
  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: false });
  }, [pastCheckIns.length]);

  const recent = pastCheckIns.slice(-20);

  function tileColor(response: CheckIn['response']) {
    if (response === 'success') return colors.do;
    if (response === 'failure') return colors.dont;
    return colors.textMuted;
  }

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={stripStyles.strip}
    >
      {recent.map((ci) => (
        <View
          key={ci.id}
          style={[stripStyles.tile, { backgroundColor: tileColor(ci.response) }]}
        />
      ))}

      {/* Current active window with live fill */}
      {hasPending && (
        <View style={stripStyles.activeTile}>
          <View
            style={[
              stripStyles.activeFill,
              {
                width: `${Math.round(windowProgress * 100)}%`,
                backgroundColor: accentColor,
              },
            ]}
          />
          {/* Pulsing border indicator */}
          <View style={[stripStyles.activeOutline, { borderColor: accentColor }]} />
        </View>
      )}

      {/* Two dim future placeholders */}
      <View style={[stripStyles.tile, stripStyles.futureTile]} />
      <View style={[stripStyles.tile, stripStyles.futureTile]} />
    </ScrollView>
  );
}

const stripStyles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  tile: {
    width: 10,
    height: 28,
    borderRadius: 3,
  },
  activeTile: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    position: 'relative',
  },
  activeFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
  },
  activeOutline: {
    position: 'absolute',
    inset: 0,
    borderWidth: 1.5,
    borderRadius: 4,
  },
  futureTile: {
    backgroundColor: colors.border,
    opacity: 0.4,
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function DirectiveDetailScreen({ route, navigation }: Props) {
  const { directiveId } = route.params;
  const { directives, checkIns, getStreak, pauseDirective, resumeDirective, deleteDirective } =
    useApp();

  // All hooks must be declared before any early return
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tick, setTick] = useState(0);

  const directive = directives.find((d) => d.id === directiveId);

  useEffect(() => {
    if (!directive) navigation.goBack();
  }, [directive]);

  // Second-level ticker for the live clock
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!directive) return null;

  const isDo = directive.type === 'DO';
  const isPaused = !directive.active && !!directive.pausedAt;
  const accentColor = isDo ? colors.do : colors.dont;
  const accentGlow = isDo ? colors.doGlow : colors.dontGlow;

  // Check-in data
  const respondedCheckIns = checkIns
    .filter((c) => c.directiveId === directiveId && c.response !== 'pending')
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()); // oldest first

  const historyCheckIns = [...respondedCheckIns].reverse(); // newest first for history list

  const pendingCheckIn = checkIns.find(
    (c) => c.directiveId === directiveId && c.response === 'pending',
  );

  // Live timer values — recomputed every tick
  const { elapsedMs, remainingMs, windowProgress } = useMemo(() => {
    if (!pendingCheckIn) return { elapsedMs: 0, remainingMs: 0, windowProgress: 0 };
    const now = Date.now();
    const dueMs = new Date(pendingCheckIn.dueAt).getTime();
    const totalMs = directive.checkInIntervalMinutes * 60 * 1000;
    const startMs = dueMs - totalMs;
    const elapsed = Math.max(now - startMs, 0);
    const remaining = Math.max(dueMs - now, 0);
    const progress = Math.min(elapsed / totalMs, 1);
    return { elapsedMs: elapsed, remainingMs: remaining, windowProgress: progress };
  }, [pendingCheckIn, directive.checkInIntervalMinutes, tick]);

  const isDue = pendingCheckIn ? remainingMs === 0 : false;

  // Timer display values
  const timerMs = isDo ? remainingMs : elapsedMs;
  const timerLabel = isPaused
    ? 'paused'
    : isDue
    ? isDo
      ? "time's up — check in"
      : 'window complete — check in'
    : isDo
    ? 'left in this window'
    : 'resisted so far';

  // Stats
  const streak = getStreak(directiveId);
  const successCount = historyCheckIns.filter((c) => c.response === 'success').length;
  const failCount = historyCheckIns.filter((c) => c.response === 'failure').length;
  const total = successCount + failCount;
  const rate = total > 0 ? Math.round((successCount / total) * 100) : null;

  // Bar color: for DO, shifts to warning/urgent as deadline approaches
  // For DON'T, stays accent (filling = achievement building)
  const barColor = isDo
    ? windowProgress >= 0.9
      ? colors.failure
      : windowProgress >= 0.75
      ? colors.warning
      : accentColor
    : accentColor;

  async function handleDelete() {
    setShowDeleteConfirm(false);
    await deleteDirective(directiveId);
    navigation.goBack();
  }

  function responseIcon(response: CheckIn['response']) {
    if (response === 'success') return { name: 'checkmark-circle' as const, color: colors.success };
    if (response === 'failure') return { name: 'close-circle' as const, color: colors.failure };
    return { name: 'remove-circle-outline' as const, color: colors.textMuted };
  }

  const ListHeader = (
    <>
      {/* Nav */}
      <View style={styles.nav}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Pressable onPress={() => setShowDeleteConfirm(true)} hitSlop={8} style={styles.navBtn}>
          <Ionicons name="trash-outline" size={18} color={colors.failure} />
        </Pressable>
      </View>

      {/* Hero card */}
      <View style={[styles.hero, { borderColor: accentColor, backgroundColor: accentGlow }]}>
        <View style={[styles.heroStripe, { backgroundColor: accentColor }]} />

        <View style={styles.heroContent}>
          {/* Title */}
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.typeLabel, { color: accentColor }]}>
                {isDo ? 'JUST DO IT' : "JUST DON'T"}
              </Text>
              <Text style={styles.heroAction}>{directive.action}</Text>
            </View>
            {/* Streak pill */}
            {streak > 0 && (
              <View style={[styles.streakPill, { borderColor: accentColor }]}>
                <Text style={[styles.streakValue, { color: accentColor }]}>🔥 {streak}</Text>
                <Text style={styles.streakSub}>streak</Text>
              </View>
            )}
          </View>

          {/* Live clock */}
          {!isPaused && pendingCheckIn && (
            <View style={styles.clockBlock}>
              <Text style={styles.clockLabel}>{timerLabel}</Text>
              <Text style={[styles.clockValue, { color: isDue ? colors.warning : accentColor }]}>
                {formatDuration(timerMs)}
              </Text>
              {/* Progress track */}
              <View style={styles.clockTrack}>
                <View
                  style={[
                    styles.clockFill,
                    { width: `${Math.round(windowProgress * 100)}%`, backgroundColor: barColor },
                  ]}
                />
              </View>
            </View>
          )}

          {isPaused && (
            <View style={styles.pausedBadge}>
              <Ionicons name="pause-circle" size={16} color={colors.warning} />
              <Text style={styles.pausedText}>This directive is paused</Text>
            </View>
          )}

          {/* Window strip */}
          <View style={styles.stripSection}>
            <Text style={styles.stripLabel}>
              {windowLabel(directive.checkInIntervalMinutes)}
            </Text>
            <WindowStrip
              pastCheckIns={respondedCheckIns}
              windowProgress={windowProgress}
              hasPending={!!pendingCheckIn && !isPaused}
              accentColor={accentColor}
            />
          </View>

          {/* Stats */}
          {total > 0 && (
            <View style={styles.statsRow}>
              <StatBox value={String(successCount)} label="wins" color={colors.success} />
              <StatBox value={String(failCount)} label="losses" color={colors.failure} />
              {rate !== null && (
                <StatBox value={`${rate}%`} label="rate" color={accentColor} />
              )}
            </View>
          )}

          {/* Duration chip */}
          <View style={styles.chips}>
            <Chip
              icon="calendar-outline"
              label={directive.durationDays ? `${directive.durationDays}-day commitment` : 'open-ended'}
            />
          </View>

          {/* Action */}
          {isPaused ? (
            <Pressable
              style={[styles.actionBtn, { backgroundColor: accentColor }]}
              onPress={() => resumeDirective(directiveId)}
            >
              <Ionicons name="play" size={18} color={colors.background} />
              <Text style={styles.actionBtnText}>Resume</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.pauseBtn} onPress={() => pauseDirective(directiveId)}>
              <Ionicons name="pause" size={16} color={colors.textSecondary} />
              <Text style={styles.pauseBtnText}>Pause this directive</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* History heading */}
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>Check-in history</Text>
        {historyCheckIns.length > 0 && (
          <Text style={styles.historyCount}>{historyCheckIns.length} entries</Text>
        )}
      </View>
      {historyCheckIns.length === 0 && (
        <Text style={styles.noHistory}>No check-ins yet.</Text>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={historyCheckIns}
        keyExtractor={(c) => c.id}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.scrollContent}
        renderItem={({ item, index }) => {
          const icon = responseIcon(item.response);
          const isLast = index === historyCheckIns.length - 1;
          return (
            <View style={[styles.historyRow, isLast && { borderBottomWidth: 0 }]}>
              <View style={[styles.historyIconWrap, { backgroundColor: `${icon.color}18` }]}>
                <Ionicons name={icon.name} size={16} color={icon.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyDate}>
                  {item.respondedAt
                    ? format(parseISO(item.respondedAt), 'MMM d, h:mm a')
                    : format(parseISO(item.dueAt), 'MMM d, h:mm a')}
                </Text>
              </View>
              <Text style={[styles.historyStatus, { color: icon.color }]}>
                {item.response}
              </Text>
            </View>
          );
        }}
      />

      {/* Delete confirmation */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowDeleteConfirm(false)}>
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="trash-outline" size={28} color={colors.failure} />
            </View>
            <Text style={styles.modalTitle}>Delete directive?</Text>
            <Text style={styles.modalBody}>
              Remove "{directive.action}"?{'\n'}This cannot be undone.
            </Text>
            <View style={styles.modalBtns}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalDeleteBtn} onPress={handleDelete}>
                <Text style={styles.modalDeleteText}>Delete</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Chip({
  icon,
  label,
  color,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  color?: string;
}) {
  return (
    <View style={chipStyles.chip}>
      <Ionicons name={icon} size={12} color={color ?? colors.textSecondary} />
      <Text style={[chipStyles.label, color ? { color } : {}]}>{label}</Text>
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
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { fontSize: fontSizes.xs, color: colors.textSecondary },
});

function StatBox({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={statStyles.box}>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  box: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  value: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.black,
    letterSpacing: -0.5,
  },
  label: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 2 },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: spacing.xl },

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

  hero: {
    marginHorizontal: spacing.md,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    flexDirection: 'row',
    overflow: 'hidden',
    ...shadows.md,
  },
  heroStripe: { width: 5 },
  heroContent: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  typeLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.black,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  heroAction: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.black,
    color: colors.text,
    letterSpacing: -0.5,
  },
  streakPill: {
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    minWidth: 60,
  },
  streakValue: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.black,
  },
  streakSub: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },

  // Live clock
  clockBlock: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clockLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  clockValue: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.black,
    letterSpacing: -1,
    lineHeight: fontSizes.xxl + 4,
  },
  clockTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  clockFill: {
    height: 4,
    borderRadius: 2,
  },

  pausedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,179,0,0.08)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,179,0,0.2)',
  },
  pausedText: {
    fontSize: fontSizes.sm,
    color: colors.warning,
    fontWeight: fontWeights.medium,
  },

  // Window strip section
  stripSection: { gap: 6 },
  stripLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    fontWeight: fontWeights.medium,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  statsRow: { flexDirection: 'row', gap: spacing.xs },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.full,
    paddingVertical: spacing.sm + 4,
  },
  actionBtnText: {
    color: colors.background,
    fontWeight: fontWeights.bold,
    fontSize: fontSizes.md,
  },
  pauseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.full,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pauseBtnText: {
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
    fontSize: fontSizes.md,
  },

  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  historyTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  historyCount: { fontSize: fontSizes.sm, color: colors.textSecondary },
  noHistory: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyIconWrap: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyDate: { fontSize: fontSizes.sm, color: colors.textSecondary },
  historyStatus: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    textTransform: 'capitalize',
  },

  // Delete modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalBox: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,68,102,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.black,
    color: colors.text,
    textAlign: 'center',
  },
  modalBody: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    marginTop: spacing.xs,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.full,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.full,
    alignItems: 'center',
    backgroundColor: colors.failure,
  },
  modalDeleteText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.black,
    color: colors.white,
  },
});
