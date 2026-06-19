import AsyncStorage from '@react-native-async-storage/async-storage';
import { CheckIn, Directive, DirectiveType } from '../types';
import {
  addCheckIn,
  addDirective,
  generateId,
  getCheckIns,
  getDirectives,
} from './storage';
import { scheduleNextCheckIn } from './notifications';

const SEED_FLAG_KEY = '@cadence/seed_v1_complete';
const NOTIF_BACKFILL_KEY = '@cadence/notif_backfill_v1';
const TEST_NOTIF_KEY = '@cadence/test_notif_v2';

interface SeedDirective {
  type: DirectiveType;
  action: string;
  checkInIntervalMinutes: number;
}

// Generic sample directives for LOCAL DEVELOPMENT ONLY. Seeding is gated behind
// __DEV__ in AppContext, so this never runs in release/TestFlight/Play builds —
// real users always start with an empty app.
const SEED: SeedDirective[] = [
  { type: 'DO', action: 'Drink a glass of water', checkInIntervalMinutes: 240 },
  { type: 'DO', action: 'Stretch for five minutes', checkInIntervalMinutes: 1440 },
  { type: 'DONT', action: 'No phone in bed', checkInIntervalMinutes: 1440 },
];

export async function seedIfNeeded(): Promise<boolean> {
  const flag = await AsyncStorage.getItem(SEED_FLAG_KEY);
  if (flag) return false;

  const existing = await getDirectives();
  if (existing.length > 0) {
    await AsyncStorage.setItem(SEED_FLAG_KEY, '1');
    return false;
  }

  const now = new Date().toISOString();
  for (const s of SEED) {
    const directive: Directive = {
      id: generateId(),
      type: s.type,
      action: s.action,
      durationDays: null,
      checkInIntervalMinutes: s.checkInIntervalMinutes,
      carryForward: false,
      createdAt: now,
      active: true,
    };
    await addDirective(directive);

    const checkIn: CheckIn = {
      id: generateId(),
      directiveId: directive.id,
      dueAt: now,
      response: 'pending',
    };
    await addCheckIn(checkIn);
  }

  await AsyncStorage.setItem(SEED_FLAG_KEY, '1');
  return true;
}

// One-time pass: schedule a native notification for every active directive's
// pending check-in. Needed because the seed wrote check-ins directly to storage
// and skipped scheduleNextCheckIn. Runs at most once thanks to the flag.
export async function backfillNotificationsIfNeeded(): Promise<number> {
  const flag = await AsyncStorage.getItem(NOTIF_BACKFILL_KEY);
  if (flag) return 0;

  const [directives, checkIns] = await Promise.all([getDirectives(), getCheckIns()]);
  let scheduled = 0;
  for (const d of directives) {
    if (!d.active) continue;
    const pending = checkIns.find(
      (c) => c.directiveId === d.id && c.response === 'pending'
    );
    if (!pending) continue;
    const dueMs = new Date(pending.dueAt).getTime();
    const delayMs = Math.max(dueMs - Date.now(), 0);
    // If due now, fire one interval out so we don't immediately spam the user.
    const effectiveDelay = delayMs > 0 ? delayMs : d.checkInIntervalMinutes * 60 * 1000;
    const id = await scheduleNextCheckIn(d, pending.id, { delayMs: effectiveDelay });
    if (id) scheduled++;
  }

  await AsyncStorage.setItem(NOTIF_BACKFILL_KEY, '1');
  return scheduled;
}

// Fire a single demo notification 3 seconds after the app mounts, once.
// Uses the real check-in scheduling path so the result matches production.
export async function fireTestNotificationOnce(): Promise<boolean> {
  const flag = await AsyncStorage.getItem(TEST_NOTIF_KEY);
  if (flag) return false;

  const [directives, checkIns] = await Promise.all([getDirectives(), getCheckIns()]);
  const directive = directives.find((d) => d.active);
  if (!directive) return false;
  const pending = checkIns.find(
    (c) => c.directiveId === directive.id && c.response === 'pending'
  );
  if (!pending) return false;

  await scheduleNextCheckIn(directive, pending.id, { delayMs: 3000 });
  await AsyncStorage.setItem(TEST_NOTIF_KEY, '1');
  return true;
}
