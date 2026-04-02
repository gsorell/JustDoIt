import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DirectiveCard from '../components/DirectiveCard';
import { useApp } from '../context/AppContext';
import { RootStackParamList } from '../types';
import { colors, fontSizes, fontWeights, radius, spacing } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { directives, isLoading, getDueCheckIn } = useApp();
  const active = directives.filter((d) => d.active || d.pausedAt);

  const dueCount = active.filter((d) => !!getDueCheckIn(d.id)).length;
  const doCount = active.filter((d) => d.type === 'DO').length;
  const dontCount = active.filter((d) => d.type === 'DONT').length;

  const today = format(new Date(), 'EEEE, MMM d');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.date}>{today}</Text>
          <Text style={styles.title}>Cadence</Text>
        </View>
        <Pressable
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddDirective')}
          hitSlop={8}
        >
          <Ionicons name="add" size={26} color={colors.background} />
        </Pressable>
      </View>

      {/* Stats bar */}
      {active.length > 0 && !isLoading && (
        <View style={styles.statsBar}>
          {dueCount > 0 && (
            <View style={styles.duePill}>
              <View style={styles.dueDot} />
              <Text style={styles.duePillText}>
                {dueCount} due now
              </Text>
            </View>
          )}
          {doCount > 0 && (
            <View style={[styles.statPill, { borderColor: colors.do }]}>
              <Text style={[styles.statPillText, { color: colors.do }]}>
                {doCount} DO
              </Text>
            </View>
          )}
          {dontCount > 0 && (
            <View style={[styles.statPill, { borderColor: colors.dont }]}>
              <Text style={[styles.statPillText, { color: colors.dont }]}>
                {dontCount} DON'T
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Content */}
      {isLoading ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.accent} size="large" />
      ) : active.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>⚡</Text>
          <Text style={styles.emptyTitle}>No commitments yet</Text>
          <Text style={styles.emptyBody}>
            Decide what you want to do — or stop doing.{'\n'}Hold yourself to it.
          </Text>
          <Pressable
            style={styles.emptyBtn}
            onPress={() => navigation.navigate('AddDirective')}
          >
            <Ionicons name="add" size={18} color={colors.background} />
            <Text style={styles.emptyBtnText}>Add your first directive</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={active}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <DirectiveCard
              directive={item}
              onPress={() => navigation.navigate('DirectiveDetail', { directiveId: item.id })}
              onCheckIn={(checkInId) =>
                navigation.navigate('CheckIn', { directiveId: item.id, checkInId })
              }
            />
          )}
        />
      )}
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerText: { gap: 2 },
  date: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.black,
    color: colors.text,
    letterSpacing: -0.8,
  },
  addBtn: {
    backgroundColor: colors.accent,
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  duePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,180,0,0.12)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,180,0,0.3)',
  },
  dueDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.warning,
  },
  duePillText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.warning,
  },
  statPill: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderWidth: 1,
  },
  statPillText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.5,
  },

  list: {
    padding: spacing.md,
    gap: spacing.sm,
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyEmoji: { fontSize: 64, marginBottom: spacing.sm },
  emptyTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.black,
    color: colors.text,
    letterSpacing: -0.5,
  },
  emptyBody: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.full,
  },
  emptyBtnText: {
    color: colors.background,
    fontWeight: fontWeights.bold,
    fontSize: fontSizes.md,
  },
});
