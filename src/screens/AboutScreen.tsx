import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CHARMS } from '../services/charms';
import { RootStackParamList } from '../types';
import { colors, fontSizes, fontWeights, radius, spacing } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'About'>;

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{n}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepBody}>{body}</Text>
      </View>
    </View>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

export default function AboutScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.nav}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Image
            source={require('../../assets/logo-mark.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Decide. Then hold yourself to it.</Text>
          <Text style={styles.subtitle}>
            A commitment tracker for the things you want to start doing — or stop.
            You set the terms; it keeps you honest, one check-in at a time.
          </Text>
        </View>

        {/* What this is */}
        <Section label="What this is">
          <Text style={styles.body}>
            Every commitment is a <Text style={styles.em}>directive</Text>: a{' '}
            <Text style={[styles.em, { color: colors.do }]}>DO</Text> (something you
            want to do regularly) or a{' '}
            <Text style={[styles.em, { color: colors.dont }]}>DON'T</Text> (something
            you want to avoid). On a cadence you choose, it asks one honest question —
            did you, or didn't you — and holds the record.
          </Text>
        </Section>

        {/* How to use it */}
        <Section label="How to use it">
          <Step
            n={1}
            title="Set a directive"
            body="Name what you'll do or avoid, pick how often to check in (every few hours, daily, weekly), and optionally a start date and end date."
          />
          <Step
            n={2}
            title="Check in each window"
            body="When a window closes you'll get a reminder. Answer it — straight from the notification, the home card, or the detail screen. No friction, no ceremony."
          />
          <Step
            n={3}
            title="Don't leave it hanging"
            body="Ignore a check-in and it doesn't sit in limbo. After a short grace period the window auto-fails and a fresh one begins, so your record always reflects reality."
          />
          <Step
            n={4}
            title="Build the streak"
            body="Each success extends your streak and adds a rep toward your next charm. A single miss costs the streak — but never your overall progress."
          />
        </Section>

        {/* The science */}
        <Section label="The basis in habit formation">
          <Text style={styles.body}>
            Habits form through repetition of a{' '}
            <Text style={styles.em}>cue → routine → reward</Text> loop. With enough
            reps the behavior shifts from effortful (run by your prefrontal cortex) to
            automatic (run by the basal ganglia). That shift is the whole game.
          </Text>
          <View style={styles.factCard}>
            <Text style={styles.factHead}>The 66-day reality</Text>
            <Text style={styles.factBody}>
              In a 2010 University College London study, Lally et al. found behaviors
              reached automaticity after a median of ~66 repetitions — with a wide
              range of about 18 to 254 depending on the person and the habit.
              Crucially, missing a single day did not derail the process.
            </Text>
          </View>
          <View style={styles.factCard}>
            <Text style={styles.factHead}>The "21 days" myth</Text>
            <Text style={styles.factBody}>
              The popular "21 days to a habit" figure isn't science — it traces to a
              1960 plastic surgeon's anecdote about patients adjusting to changes.
              Real change usually takes longer, and that's normal.
            </Text>
          </View>
          <Text style={styles.body}>
            Because one slip doesn't undo automaticity, your{' '}
            <Text style={styles.em}>charms</Text> track{' '}
            <Text style={styles.em}>cumulative reps</Text>, not a fragile streak —
            progress you can never lose to a single bad day. They also map to the
            Action → Maintenance arc of Prochaska's stages of change, so you can see
            where you actually are in the process.
          </Text>
        </Section>

        {/* Charms */}
        <Section label="Charms — your journey markers">
          <Text style={styles.body}>
            Each charm marks a real milestone in forming the habit. They unlock as your
            successful reps add up:
          </Text>
          <View style={styles.charmList}>
            {CHARMS.map((c) => (
              <View key={c.threshold} style={styles.charmRow}>
                <Text style={styles.charmGlyph}>{c.glyph}</Text>
                <Text style={styles.charmReps}>{c.threshold}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.charmName}>{c.name}</Text>
                  <Text style={styles.charmPhase}>{c.phase}</Text>
                </View>
              </View>
            ))}
          </View>
        </Section>

        <Text style={styles.footer}>Decide what matters. Then prove it to yourself.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
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
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },

  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  logo: { height: 72, width: 72, marginBottom: spacing.xs },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.black,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  section: { gap: spacing.sm },
  sectionLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    fontWeight: fontWeights.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  body: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    lineHeight: 23,
  },
  em: {
    color: colors.text,
    fontWeight: fontWeights.bold,
  },

  step: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.black,
    color: colors.accent,
  },
  stepTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginBottom: 2,
  },
  stepBody: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  factCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  factHead: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.black,
    color: colors.text,
  },
  factBody: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  charmList: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  charmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  charmGlyph: { fontSize: 22, width: 28, textAlign: 'center' },
  charmReps: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.black,
    color: colors.textMuted,
    width: 34,
  },
  charmName: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  charmPhase: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  footer: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
