import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, fontSizes, fontWeights } from '../utils/theme';

interface CountdownRingProps {
  /** Elapsed fraction of the window, 0–1. */
  progress: number;
  /** Big text rendered in the center (e.g. remaining time). */
  timeText: string;
  /** Small caption above the time. */
  label: string;
  isDo: boolean;
  accentColor: string;
  isDue: boolean;
  /** Changes once per second — drives the heartbeat pulse. */
  pulseKey: number;
  size?: number;
}

const STROKE = 14;

/**
 * Radial countdown. For a DO directive the arc *drains* as time runs out; for a
 * DON'T it *fills* as clean time accrues. The arc color shifts to warning then
 * failure as a DO deadline approaches, and a per-second heartbeat makes the
 * passage of time felt rather than just shown.
 */
export default function CountdownRing({
  progress,
  timeText,
  label,
  isDo,
  accentColor,
  isDue,
  pulseKey,
  size = 220,
}: CountdownRingProps) {
  const nativeDriver = Platform.OS !== 'web';

  const radius = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;

  const clamped = Math.min(Math.max(progress, 0), 1);
  // DO drains (show remaining); DON'T fills (show accrued).
  const arcFraction = isDo ? 1 - clamped : clamped;

  const ringColor = isDo
    ? clamped >= 0.9
      ? colors.failure
      : clamped >= 0.75
      ? colors.warning
      : accentColor
    : accentColor;

  // The component re-renders each second (driven by pulseKey), so we compute the
  // arc offset directly — no animated SVG prop, which keeps react-native-web from
  // leaking invalid DOM attributes to the console.
  const dashoffset = circumference * (1 - arcFraction);

  // Heartbeat — a quick scale + glow blip on every tick, stronger when urgent.
  const pulse = useRef(new Animated.Value(0)).current;
  const urgent = isDo && clamped >= 0.75;

  useEffect(() => {
    pulse.setValue(0);
    Animated.sequence([
      Animated.timing(pulse, {
        toValue: 1,
        duration: 140,
        useNativeDriver: nativeDriver,
      }),
      Animated.timing(pulse, {
        toValue: 0,
        duration: 600,
        useNativeDriver: nativeDriver,
      }),
    ]).start();
  }, [pulseKey, pulse, nativeDriver]);

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, urgent ? 1.025 : 1.012],
  });
  const glowOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.06, urgent ? 0.22 : 0.12],
  });

  return (
    <Animated.View style={[styles.wrap, { width: size, height: size, transform: [{ scale }] }]}>
      {/* Pulsing glow behind the ring */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: ringColor,
            opacity: glowOpacity,
          },
        ]}
      />

      {/* Rotate the whole SVG -90° (via a RN View transform, which rotates about
          its center) so the arc starts at 12 o'clock and sweeps clockwise. */}
      <View style={styles.svgRotate}>
        <Svg width={size} height={size}>
          {/* Track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.border}
            strokeWidth={STROKE}
            fill="none"
          />
          {/* Progress arc */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={ringColor}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
          />
        </Svg>
      </View>

      {/* Center readout */}
      <View style={[styles.center, styles.noPointer]}>
        <Text style={[styles.label, isDue && { color: colors.warning }]} numberOfLines={2}>
          {label}
        </Text>
        <Text
          style={[styles.time, { color: isDue ? colors.warning : ringColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {timeText}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  glow: {
    position: 'absolute',
  },
  svgRotate: {
    transform: [{ rotate: '-90deg' }],
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  noPointer: {
    pointerEvents: 'none',
  },
  label: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
    textAlign: 'center',
  },
  time: {
    fontSize: 32,
    fontWeight: fontWeights.black,
    letterSpacing: -1,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
});
