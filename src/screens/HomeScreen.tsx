import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import DirectiveCard from '../components/DirectiveCard';
import { useApp } from '../context/AppContext';
import { RootStackParamList } from '../types';
import { colors, fontSizes, fontWeights, radius, spacing } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

type Filter = 'due' | 'do' | 'dont';

export default function HomeScreen({ navigation }: Props) {
  const { directives, isLoading, getDueCheckIn } = useApp();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = React.useState<Filter | null>(null);
  const active = directives.filter((d) => d.active || d.pausedAt);

  const dueCount = active.filter((d) => !!getDueCheckIn(d.id)).length;
  const doCount = active.filter((d) => d.type === 'DO').length;
  const dontCount = active.filter((d) => d.type === 'DONT').length;

  const toggleFilter = (f: Filter) => setFilter((cur) => (cur === f ? null : f));

  // Filtered list shown below the stats bar. Tapping a pill toggles its filter.
  const displayed = active.filter((d) => {
    if (filter === 'due') return !!getDueCheckIn(d.id);
    if (filter === 'do') return d.type === 'DO';
    if (filter === 'dont') return d.type === 'DONT';
    return true;
  });

  const today = format(new Date(), 'EEEE, MMM d');

  const showHeader = active.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

      {/* Settings + About — always reachable */}
      <Pressable
        style={styles.settingsBtn}
        onPress={() => navigation.navigate('Settings')}
        hitSlop={8}
      >
        <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
      </Pressable>
      <Pressable
        style={styles.aboutBtn}
        onPress={() => navigation.navigate('About')}
        hitSlop={8}
      >
        <Ionicons name="information-circle-outline" size={24} color={colors.textSecondary} />
      </Pressable>

      {/* Slim header — only when there are commitments to anchor */}
      {showHeader && (
        <View style={styles.hero}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.slogan}>Repetition becomes you.</Text>
          <Text style={styles.date}>{today}</Text>
        </View>
      )}

      {/* Stats bar */}
      {active.length > 0 && !isLoading && (
        <View style={styles.statsBar}>
          {dueCount > 0 && (
            <Pressable
              style={[styles.duePill, filter === 'due' && styles.duePillActive]}
              onPress={() => toggleFilter('due')}
            >
              <View style={styles.dueDot} />
              <Text style={styles.duePillText}>
                {dueCount} due now
              </Text>
            </Pressable>
          )}
          {doCount > 0 && (
            <Pressable
              style={[
                styles.statPill,
                { borderColor: colors.do },
                filter === 'do' && { backgroundColor: colors.do },
              ]}
              onPress={() => toggleFilter('do')}
            >
              <Text
                style={[
                  styles.statPillText,
                  { color: filter === 'do' ? colors.background : colors.do },
                ]}
              >
                {doCount} DO
              </Text>
            </Pressable>
          )}
          {dontCount > 0 && (
            <Pressable
              style={[
                styles.statPill,
                { borderColor: colors.dont },
                filter === 'dont' && { backgroundColor: colors.dont },
              ]}
              onPress={() => toggleFilter('dont')}
            >
              <Text
                style={[
                  styles.statPillText,
                  { color: filter === 'dont' ? colors.background : colors.dont },
                ]}
              >
                {dontCount} DON'T
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Content */}
      {isLoading ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.accent} size="large" />
      ) : active.length === 0 ? (
        <View style={styles.empty}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.emptyLogo}
            resizeMode="contain"
          />
          <View style={styles.emptyMessage}>
            <Text style={styles.emptyCaption}>No commitments yet</Text>
            <Text style={styles.emptyTitle}>
              Decide what you want to do —{'\n'}or stop doing.
            </Text>
            <Text style={styles.emptyBody}>Hold yourself to it.</Text>
          </View>
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
          data={displayed}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <DirectiveCard
              directive={item}
              onPress={() => navigation.navigate('DirectiveDetail', { directiveId: item.id })}
            />
          )}
        />
      )}

      {/* FAB — only when there are commitments; empty state has its own CTA */}
      {active.length > 0 && (
        <Pressable
          style={[styles.addBtn, { bottom: insets.bottom + spacing.lg }]}
          onPress={() => navigation.navigate('AddDirective')}
          hitSlop={8}
        >
          <Ionicons name="add" size={28} color={colors.background} />
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  aboutBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsBtn: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addBtn: {
    position: 'absolute',
    right: spacing.lg,
    zIndex: 10,
    backgroundColor: colors.accent,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  hero: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  logo: {
    height: 180,
    width: 180,
    // The wordmark sits in a padded square canvas; pull the slogan up to close
    // the visual gap created by that built-in whitespace so it matches the
    // slogan→date spacing below.
    marginBottom: -36,
  },
  slogan: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.black,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  date: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
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
  duePillActive: {
    backgroundColor: 'rgba(255,180,0,0.28)',
    borderColor: colors.warning,
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: '14%',
    paddingBottom: '14%',
  },
  emptyLogo: {
    height: 240,
    width: 240,
  },
  emptyMessage: {
    alignItems: 'center',
  },
  emptyCaption: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.black,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 32,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyBtn: {
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
