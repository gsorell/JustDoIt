import React from 'react';
import { useApp } from '../context/AppContext';
import { colors } from '../utils/theme';
import SuccessOverlay from './SuccessOverlay';

/**
 * App-level host for the charm celebration. Quiet check-ins (home card, detail
 * buttons, notification actions) advance silently — but when one unlocks a charm,
 * the context sets `celebration` and this renders the full overlay on top of
 * whatever screen the user is on, so a milestone is never missed.
 */
export default function CelebrationHost() {
  const { celebration, dismissCelebration } = useApp();

  if (!celebration) return null;

  return (
    <SuccessOverlay
      streak={celebration.streak}
      isDo={celebration.isDo}
      accentColor={celebration.isDo ? colors.do : colors.dont}
      action={celebration.action}
      unlockedCharm={celebration.charm}
      cleanTimeMinutes={celebration.cleanTimeMinutes}
      onDismiss={dismissCelebration}
    />
  );
}
