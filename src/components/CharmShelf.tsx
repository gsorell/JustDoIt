import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  CHARMS,
  earnedCharms,
  latestCharm,
  nextCharm,
  progressToNext,
} from '../services/charms';
import { colors, fontSizes, fontWeights, radius, spacing } from '../utils/theme';

interface Props {
  /** Cumulative successful reps for the directive. */
  reps: number;
  accentColor: string;
}

/**
 * The habit-formation "journey" — earned charms, the current phase with a grounded
 * insight, and progress toward the next charm. Tied to cumulative reps so a single
 * miss never erases the journey.
 */
export default function CharmShelf({ reps, accentColor }: Props) {
  const earned = earnedCharms(reps);
  const latest = latestCharm(reps);
  const next = nextCharm(reps);
  const progress = progressToNext(reps);

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>Habit journey</Text>

      {latest ? (
        <View style={[styles.phaseCard, { borderColor: accentColor }]}>
          <View style={styles.phaseHead}>
            <Text style={styles.phaseGlyph}>{latest.glyph}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.phaseName, { color: accentColor }]}>{latest.name}</Text>
              <Text style={styles.phaseStage}>{latest.phase}</Text>
            </View>
          </View>
          <Text style={styles.insight}>{latest.insight}</Text>
        </View>
      ) : (
        <View style={styles.phaseCard}>
          <Text style={styles.insight}>
            Your first successful check-in unlocks the journey. Starting is the
            highest-friction moment — clear it once and the path opens.
          </Text>
        </View>
      )}

      {/* All charms — earned ones lit, the rest dimmed */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.charmRow}
      >
        {CHARMS.map((c) => {
          const isEarned = reps >= c.threshold;
          return (
            <View
              key={c.threshold}
              style={[styles.charm, isEarned && { borderColor: accentColor }]}
            >
              <Text style={[styles.charmGlyph, !isEarned && styles.charmLocked]}>
                {isEarned ? c.glyph : '🔒'}
              </Text>
              <Text style={styles.charmThreshold}>{c.threshold}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Progress to next charm */}
      {next ? (
        <View style={styles.nextBlock}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round(progress * 100)}%`, backgroundColor: accentColor },
              ]}
            />
          </View>
          <Text style={styles.nextText}>
            {reps} / {next.threshold} reps → {next.glyph} {next.name}
          </Text>
        </View>
      ) : (
        <Text style={styles.nextText}>
          Every charm earned. {earned.length} milestones — this habit is yours.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  sectionLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    fontWeight: fontWeights.medium,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  phaseCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  phaseHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  phaseGlyph: { fontSize: 30 },
  phaseName: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.black,
    letterSpacing: -0.3,
  },
  phaseStage: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  insight: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  charmRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: 2,
  },
  charm: {
    width: 46,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  charmGlyph: { fontSize: 20 },
  charmLocked: { opacity: 0.5 },
  charmThreshold: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: fontWeights.bold,
  },
  nextBlock: { gap: 6 },
  progressTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: 4, borderRadius: 2 },
  nextText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
});
