import AsyncStorage from '@react-native-async-storage/async-storage';
import { subDays } from 'date-fns';
import { AppSettings, CheckIn, CheckInResponse, Directive } from '../types';

const KEYS = {
  DIRECTIVES: '@justdoit/directives',
  CHECK_INS: '@justdoit/check_ins',
  APP_SETTINGS: '@justdoit/app_settings',
};

// ─── Directives ──────────────────────────────────────────────────────────────

export async function getDirectives(): Promise<Directive[]> {
  const raw = await AsyncStorage.getItem(KEYS.DIRECTIVES);
  return raw ? JSON.parse(raw) : [];
}

async function saveDirectives(directives: Directive[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.DIRECTIVES, JSON.stringify(directives));
}

export async function addDirective(directive: Directive): Promise<void> {
  const all = await getDirectives();
  await saveDirectives([...all, directive]);
}

export async function updateDirective(
  id: string,
  patch: Partial<Directive>
): Promise<void> {
  const all = await getDirectives();
  await saveDirectives(all.map((d) => (d.id === id ? { ...d, ...patch } : d)));
}

export async function deleteDirective(id: string): Promise<void> {
  const all = await getDirectives();
  await saveDirectives(all.filter((d) => d.id !== id));
  // Also prune check-ins for this directive
  const checkIns = await getCheckIns();
  await saveCheckIns(checkIns.filter((c) => c.directiveId !== id));
}

// ─── Check-ins ───────────────────────────────────────────────────────────────

export async function getCheckIns(directiveId?: string): Promise<CheckIn[]> {
  const raw = await AsyncStorage.getItem(KEYS.CHECK_INS);
  const all: CheckIn[] = raw ? JSON.parse(raw) : [];
  if (directiveId) return all.filter((c) => c.directiveId === directiveId);
  return all;
}

async function saveCheckIns(checkIns: CheckIn[]): Promise<void> {
  // Prune entries older than 90 days
  const cutoff = subDays(new Date(), 90).toISOString();
  const pruned = checkIns.filter((c) => c.dueAt >= cutoff);
  await AsyncStorage.setItem(KEYS.CHECK_INS, JSON.stringify(pruned));
}

export async function addCheckIn(checkIn: CheckIn): Promise<void> {
  const all = await getCheckIns();
  await saveCheckIns([...all, checkIn]);
}

export async function updateCheckIn(
  id: string,
  patch: Partial<CheckIn>
): Promise<void> {
  const all = await getCheckIns();
  await saveCheckIns(all.map((c) => (c.id === id ? { ...c, ...patch } : c)));
}

// ─── Streak ───────────────────────────────────────────────────────────────────

export function computeStreak(
  directiveId: string,
  allCheckIns: CheckIn[]
): number {
  const responded = allCheckIns
    .filter(
      (c) =>
        c.directiveId === directiveId &&
        c.response !== 'pending' &&
        c.respondedAt
    )
    .sort(
      (a, b) =>
        new Date(b.respondedAt!).getTime() - new Date(a.respondedAt!).getTime()
    );

  let streak = 0;
  for (const c of responded) {
    if (c.response === 'success') {
      streak++;
    } else if (c.response === 'failure') {
      break;
    }
    // skipped does not break or increment the streak
  }
  return streak;
}

// ─── App Settings ────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = {
  hasCompletedOnboarding: false,
  notificationsEnabled: false,
};

export async function getAppSettings(): Promise<AppSettings> {
  const raw = await AsyncStorage.getItem(KEYS.APP_SETTINGS);
  return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
}

export async function saveAppSettings(
  settings: Partial<AppSettings>
): Promise<void> {
  const current = await getAppSettings();
  await AsyncStorage.setItem(
    KEYS.APP_SETTINGS,
    JSON.stringify({ ...current, ...settings })
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function pendingCheckInForDirective(
  directiveId: string,
  checkIns: CheckIn[]
): CheckIn | undefined {
  return checkIns.find(
    (c) => c.directiveId === directiveId && c.response === 'pending'
  );
}

export function intervalLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes === 60) return '1 hour';
  if (minutes < 1440) return `${minutes / 60} hours`;
  if (minutes === 1440) return '1 day';
  return `${minutes / 1440} days`;
}
