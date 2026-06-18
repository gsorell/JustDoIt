// Habit-formation "charms" — milestones unlocked by cumulative successful
// check-ins (repetitions), not a brittle current streak. Lally et al. (2010,
// European Journal of Social Psychology) found that missing a single opportunity
// did not meaningfully set back automaticity, so progress here accrues with total
// reps and is never lost to one slip.
//
// The thresholds and copy are drawn from real research:
//  • Lally et al. (2010): median ~66 repetitions to automaticity, range ~18–254.
//  • The "21 days" figure is a myth — it traces to Maxwell Maltz's 1960 surgical
//    observation (Psycho-Cybernetics), not behavioral data.
//  • Prochaska & DiClemente's Transtheoretical Model: Action → Maintenance stages.
//  • Habit loop (cue → routine → reward) and the prefrontal-to-basal-ganglia
//    shift that underlies automaticity.

import { CheckIn } from '../types';

export interface Charm {
  /** Cumulative successful reps required to unlock. */
  threshold: number;
  /** Charm name. */
  name: string;
  /** Emoji glyph. */
  glyph: string;
  /** Habit-formation phase this charm marks. */
  phase: string;
  /** Short encouragement shown on unlock. */
  encouragement: string;
  /** A grounded insight into where the user is in the process. */
  insight: string;
}

// Sorted ascending by threshold.
export const CHARMS: Charm[] = [
  {
    threshold: 1,
    name: 'Ignition',
    glyph: '🔥',
    phase: 'Initiation',
    encouragement: 'You started. The highest-friction moment is already behind you.',
    insight:
      'Right now this takes conscious effort — your prefrontal cortex is driving, not yet your basal ganglia. That is exactly how every habit begins.',
  },
  {
    threshold: 3,
    name: 'Spark',
    glyph: '✨',
    phase: 'Early effort',
    encouragement: 'Three reps in. The pattern is starting to register.',
    insight:
      'Each repetition begins etching a cue → routine → reward loop. It still feels deliberate — that is normal this early.',
  },
  {
    threshold: 7,
    name: 'First Cycle',
    glyph: '🌒',
    phase: 'Building',
    encouragement: 'A full cycle of reps. The rhythm is taking hold.',
    insight:
      'Repetition is strengthening the neural pathway. The behavior still needs intention, but the groundwork is laid.',
  },
  {
    threshold: 14,
    name: 'Groove',
    glyph: '🪡',
    phase: 'Building',
    encouragement: 'The groove is forming. Reps are getting smoother.',
    insight:
      'Context cues are beginning to trigger the behavior with less deliberation — the first signs of automaticity.',
  },
  {
    threshold: 21,
    name: 'Past the Myth',
    glyph: '🎭',
    phase: 'Strengthening',
    encouragement: "You've passed the famous '21 days.'",
    insight:
      "That number is a myth — it came from a 1960 plastic-surgery observation, not behavioral data. Real automaticity takes longer, and you're right on track.",
  },
  {
    threshold: 30,
    name: 'Action',
    glyph: '📅',
    phase: 'Action stage',
    encouragement: 'A full month of repetitions.',
    insight:
      "In Prochaska's Transtheoretical Model you're solidly in the Action stage — actively reshaping behavior and overriding the old default.",
  },
  {
    threshold: 66,
    name: 'Automaticity',
    glyph: '🧠',
    phase: 'Tipping point',
    encouragement: 'The scientific tipping point.',
    insight:
      'Lally et al. (2010) found the median behavior reaches automaticity around 66 repetitions. The behavior is becoming self-sustaining — it needs you less.',
  },
  {
    threshold: 90,
    name: 'Maintenance',
    glyph: '🛡️',
    phase: 'Maintenance stage',
    encouragement: 'Ninety reps. The habit is holding itself up.',
    insight:
      'You\'ve entered the Maintenance stage — the work shifts from building the habit to protecting it from disruption and relapse.',
  },
  {
    threshold: 180,
    name: 'Identity',
    glyph: '🪞',
    phase: 'Identity',
    encouragement: 'This is no longer something you do — it\'s who you are.',
    insight:
      "The behavior is folding into self-concept. Identity-based habits are the most durable: you're becoming 'a person who does this.'",
  },
  {
    threshold: 254,
    name: 'Forged',
    glyph: '💎',
    phase: 'Fully automatic',
    encouragement: 'As ingrained as habits get.',
    insight:
      'Lally\'s study saw even difficult behaviors reach automaticity by ~254 repetitions — the far end of the curve. This one runs on its own now.',
  },
  {
    threshold: 365,
    name: 'Year One',
    glyph: '🏆',
    phase: 'Mastery',
    encouragement: 'A year-scale commitment.',
    insight:
      "You're beyond the formation curve entirely. There's no meaningful 'forming' left — this is simply who you are.",
  },
];

/** Data needed to render the full celebration overlay when a charm unlocks. */
export interface CharmCelebration {
  charm: Charm;
  streak: number;
  isDo: boolean;
  action: string;
  cleanTimeMinutes: number | null;
}

/** Cumulative successful check-ins for a directive — the rep count charms use. */
export function repCount(directiveId: string, checkIns: CheckIn[]): number {
  return checkIns.filter(
    (c) => c.directiveId === directiveId && c.response === 'success'
  ).length;
}

export function earnedCharms(reps: number): Charm[] {
  return CHARMS.filter((c) => reps >= c.threshold);
}

/** The most recently earned charm, if any. */
export function latestCharm(reps: number): Charm | undefined {
  const earned = earnedCharms(reps);
  return earned[earned.length - 1];
}

/** The next charm still to earn, if any. */
export function nextCharm(reps: number): Charm | undefined {
  return CHARMS.find((c) => reps < c.threshold);
}

/** The charm unlocked exactly at this rep count (for celebration), if any. */
export function charmUnlockedAt(reps: number): Charm | undefined {
  return CHARMS.find((c) => c.threshold === reps);
}

/** Progress 0–1 from the last earned threshold toward the next charm. */
export function progressToNext(reps: number): number {
  const next = nextCharm(reps);
  if (!next) return 1;
  const prev = latestCharm(reps)?.threshold ?? 0;
  return Math.min(Math.max((reps - prev) / (next.threshold - prev), 0), 1);
}
