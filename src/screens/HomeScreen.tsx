import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
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
import { colors, fontSizes, fontWeights, spacing } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { directives, isLoading } = useApp();
  const active = directives.filter((d) => d.active || d.pausedAt);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Just Do It</Text>
        <Pressable
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddDirective')}
          hitSlop={8}
        >
          <Ionicons name="add" size={28} color={colors.white} />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator
          style={{ flex: 1 }}
          color={colors.accent}
          size="large"
        />
      ) : active.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🎯</Text>
          <Text style={styles.emptyTitle}>No commitments yet</Text>
          <Text style={styles.emptyBody}>
            Tap + to add something you want to do — or stop doing.
          </Text>
          <Pressable
            style={styles.emptyBtn}
            onPress={() => navigation.navigate('AddDirective')}
          >
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
              onPress={() =>
                navigation.navigate('DirectiveDetail', {
                  directiveId: item.id,
                })
              }
              onCheckIn={(checkInId) =>
                navigation.navigate('CheckIn', {
                  directiveId: item.id,
                  checkInId,
                })
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
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.black,
    color: colors.text,
    letterSpacing: -0.5,
  },
  addBtn: {
    backgroundColor: colors.accent,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { padding: spacing.md, gap: spacing.sm },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyIcon: { fontSize: 56 },
  emptyTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginTop: spacing.sm,
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderRadius: 999,
  },
  emptyBtnText: {
    color: colors.white,
    fontWeight: fontWeights.semibold,
    fontSize: fontSizes.md,
  },
});
