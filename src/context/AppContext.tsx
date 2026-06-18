import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  AppSettings,
  CheckIn,
  CheckInResponse,
  Directive,
  DirectiveType,
} from '../types';
import {
  addCheckIn,
  addDirective as storageAddDirective,
  deleteDirective as storageDeleteDirective,
  computeStreak,
  generateId,
  getAppSettings,
  getCheckIns,
  getDirectives,
  pendingCheckInForDirective,
  saveAppSettings,
  updateCheckIn,
  updateDirective,
} from '../services/storage';
import {
  graceMsFor,
  nextDueAtFromPreviousDue,
  nextDueAtFromStart,
  shiftOutOfQuietHours,
  type QuietHours,
} from '../services/scheduling';
import { CharmCelebration, charmUnlockedAt, repCount } from '../services/charms';

// Map persisted settings onto the QuietHours shape the scheduler expects.
function quietFrom(s: AppSettings | null): QuietHours {
  return {
    enabled: s?.quietHoursEnabled ?? true,
    startMinutes: s?.quietStartMinutes ?? 22 * 60,
    endMinutes: s?.quietEndMinutes ?? 7 * 60,
  };
}
import {
  cancelDirectiveNotifications,
  requestNotificationPermissions,
  scheduleNextCheckIn,
} from '../services/notifications';
import {
  backfillNotificationsIfNeeded,
  fireTestNotificationOnce,
  seedIfNeeded,
} from '../services/seed';

interface NewDirectivePayload {
  type: DirectiveType;
  action: string;
  durationDays: number | null;
  checkInIntervalMinutes: number;
  checkInTimeOfDayMinutes?: number;
  carryForward: boolean;
  startAt?: string; // ISO — if set and future, defers first check-in
  endAt?: string;   // ISO — explicit end date
}

interface AppContextType {
  directives: Directive[];
  checkIns: CheckIn[];
  settings: AppSettings | null;
  isLoading: boolean;
  addDirective: (payload: NewDirectivePayload) => Promise<void>;
  updateDirectiveCheckInTime: (directiveId: string, minutesOfDay: number) => Promise<void>;
  respondToCheckIn: (checkInId: string, response: 'success' | 'failure') => Promise<void>;
  quickCheckIn: (checkInId: string, response: 'success' | 'failure') => Promise<void>;
  failCurrentWindow: (directiveId: string) => Promise<void>;
  celebration: CharmCelebration | null;
  dismissCelebration: () => void;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  pauseDirective: (id: string) => Promise<void>;
  resumeDirective: (id: string) => Promise<void>;
  deleteDirective: (id: string) => Promise<void>;
  getStreak: (directiveId: string) => number;
  getDueCheckIn: (directiveId: string) => CheckIn | undefined;
  getPendingCheckIn: (directiveId: string) => CheckIn | undefined;
  refresh: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [directives, setDirectives] = useState<Directive[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [celebration, setCelebration] = useState<CharmCelebration | null>(null);

  // Map of directiveId -> notification identifier
  const notifIds = useRef<Record<string, string>>({});

  // Guards against overlapping reconcile passes (launch + foreground) racing on
  // storage and double-creating windows.
  const reconciling = useRef(false);

  const load = useCallback(async () => {
    const [dirs, cis, setts] = await Promise.all([
      getDirectives(),
      getCheckIns(),
      getAppSettings(),
    ]);
    setDirectives(dirs);
    setCheckIns(cis);
    setSettings(setts);
  }, []);

  // Grace-then-auto-fail reconciliation. Runs on launch and on every foreground
  // so that ignoring check-ins still moves the commitment forward: a window that
  // passes its deadline + grace with no response auto-fails, and the clock
  // advances one window at a time so a long absence is recorded as the missed
  // windows it actually was — not a single stale "due now". Writes directly to
  // storage; callers should load() afterward to pick up the changes.
  const reconcile = useCallback(async () => {
    if (reconciling.current) return;
    reconciling.current = true;
    try {
      await reconcileInner();
    } finally {
      reconciling.current = false;
    }
  }, []);

  const reconcileInner = async () => {
    const [allDirectives, allCheckIns, setts] = await Promise.all([
      getDirectives(),
      getCheckIns(),
      getAppSettings(),
    ]);
    const quiet = quietFrom(setts);
    const nowMs = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    // Cap how many individual failures we'll record for one absence so a tiny
    // interval + long gap can't balloon storage; beyond it we collapse the rest.
    const MAX_BACKFILL = 60;

    for (const directive of allDirectives) {
      if (!directive.active) continue; // paused/inactive: never auto-fail

      // Not started yet — leave the first window scheduled.
      const startMs = directive.startAt ? new Date(directive.startAt).getTime() : null;
      if (startMs && startMs > nowMs) continue;

      const firstPending = allCheckIns.find(
        (c) => c.directiveId === directive.id && c.response === 'pending'
      );
      if (!firstPending) continue;

      // Effective end of the commitment — don't manufacture windows past it.
      const baseMs = startMs ?? new Date(directive.createdAt).getTime();
      const endMs = directive.endAt
        ? new Date(directive.endAt).getTime()
        : directive.durationDays != null
        ? baseMs + directive.durationDays * DAY_MS
        : null;

      const intervalMs = directive.checkInIntervalMinutes * 60 * 1000;
      const graceMs = graceMsFor(directive.checkInIntervalMinutes);

      let current: CheckIn = firstPending;
      let live: CheckIn | undefined = firstPending; // the window left pending
      let dirChanged = false;
      let recorded = 0;

      while (true) {
        const dueMs = new Date(current.dueAt).getTime();
        // Past the commitment's end, or still inside its actionable life — stop.
        if (endMs != null && dueMs > endMs) break;
        if (nowMs <= dueMs + graceMs) break;

        const graceEnd = dueMs + graceMs;
        await updateCheckIn(current.id, {
          response: 'failure',
          respondedAt: new Date(graceEnd).toISOString(),
        });
        dirChanged = true;
        recorded++;

        // Next window's deadline. On overflow, skip straight to the live slot
        // instead of recording every missed window.
        let nextDueMs = dueMs + intervalMs;
        if (recorded >= MAX_BACKFILL) {
          while (nowMs > nextDueMs + graceMs) nextDueMs += intervalMs;
        }
        // Never let a window come due during quiet hours.
        nextDueMs = shiftOutOfQuietHours(nextDueMs, quiet);

        // Don't open a new window beyond the commitment's end.
        if (endMs != null && nextDueMs > endMs) {
          live = undefined;
          break;
        }

        const nextCheckIn: CheckIn = {
          id: generateId(),
          directiveId: directive.id,
          dueAt: new Date(nextDueMs).toISOString(),
          response: 'pending',
        };
        await addCheckIn(nextCheckIn);
        current = nextCheckIn;
        live = nextCheckIn;

        if (recorded >= MAX_BACKFILL) break;
      }

      if (!dirChanged) continue;

      // Re-point this directive's notification at the live window. The old one
      // already fired (it was overdue), so cancelling is just cleanup.
      if (notifIds.current[directive.id]) {
        await cancelDirectiveNotifications([notifIds.current[directive.id]]);
        delete notifIds.current[directive.id];
      }
      if (live) {
        const dueMs = new Date(live.dueAt).getTime();
        if (dueMs > nowMs) {
          const notifId = await scheduleNextCheckIn(directive, live.id, {
            delayMs: dueMs - nowMs,
          });
          if (notifId) notifIds.current[directive.id] = notifId;
        }
      }
    }
  };

  useEffect(() => {
    seedIfNeeded()
      .catch(() => {})
      .then(() => backfillNotificationsIfNeeded().catch(() => 0))
      .then(() => reconcile().catch(() => {}))
      .then(load)
      .then(() => fireTestNotificationOnce().catch(() => false))
      .finally(() => setIsLoading(false));
  }, [load, reconcile]);

  // Reconcile missed windows, then refresh, on foreground
  useEffect(() => {
    const sub = AppState.addEventListener(
      'change',
      (state: AppStateStatus) => {
        if (state === 'active') reconcile().catch(() => {}).then(load);
      }
    );
    return () => sub.remove();
  }, [load, reconcile]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      await saveAppSettings(patch);
      await load();
    },
    [load]
  );

  const addDirective = useCallback(
    async (payload: NewDirectivePayload) => {
      const now = new Date().toISOString();
      const directive: Directive = {
        id: generateId(),
        ...payload,
        createdAt: now,
        active: true,
      };
      await storageAddDirective(directive);

      // If startAt is in the future, first check-in is due startAt + interval.
      // Otherwise (starts now), first check-in is due now + interval.
      const effectiveStartMs = payload.startAt && new Date(payload.startAt).getTime() > Date.now()
        ? new Date(payload.startAt).getTime()
        : Date.now();

      // Schedule first check-in
      const checkIn: CheckIn = {
        id: generateId(),
        directiveId: directive.id,
        dueAt: nextDueAtFromStart(
          effectiveStartMs,
          payload.checkInIntervalMinutes,
          payload.checkInTimeOfDayMinutes,
          quietFrom(settings)
        ),
        response: 'pending',
      };
      await addCheckIn(checkIn);

      const delayMs = Math.max(new Date(checkIn.dueAt).getTime() - Date.now(), 0);
      const notifId = await scheduleNextCheckIn(directive, checkIn.id, { delayMs });
      if (notifId) notifIds.current[directive.id] = notifId;

      await load();
    },
    [load, settings]
  );

  const updateDirectiveCheckInTime = useCallback(
    async (directiveId: string, minutesOfDay: number) => {
      const directive = directives.find((d) => d.id === directiveId);
      if (!directive) return;

      await updateDirective(directiveId, { checkInTimeOfDayMinutes: minutesOfDay });

      if (notifIds.current[directiveId]) {
        await cancelDirectiveNotifications([notifIds.current[directiveId]]);
        delete notifIds.current[directiveId];
      }

      const pending = pendingCheckInForDirective(directiveId, checkIns);
      if (pending && directive.active) {
        const nextDueAt = nextDueAtFromStart(
          Date.now(),
          directive.checkInIntervalMinutes,
          minutesOfDay,
          quietFrom(settings)
        );
        await updateCheckIn(pending.id, { dueAt: nextDueAt });

        const delayMs = Math.max(new Date(nextDueAt).getTime() - Date.now(), 0);
        const notifId = await scheduleNextCheckIn(
          { ...directive, checkInTimeOfDayMinutes: minutesOfDay },
          pending.id,
          { delayMs }
        );
        if (notifId) notifIds.current[directiveId] = notifId;
      }

      await load();
    },
    [checkIns, directives, load, settings]
  );

  const respondToCheckIn = useCallback(
    async (checkInId: string, response: 'success' | 'failure') => {
      const now = new Date().toISOString();
      await updateCheckIn(checkInId, { response, respondedAt: now });

      // Find the directive so we can schedule the next check-in
      const ci = checkIns.find((c) => c.id === checkInId);
      if (!ci) {
        await load();
        return;
      }
      const directive = directives.find((d) => d.id === ci.directiveId);
      if (!directive || !directive.active) {
        await load();
        return;
      }

      if (response === 'success') {
        const nextDueAt = nextDueAtFromPreviousDue(ci.dueAt, directive, Date.now(), quietFrom(settings));
        // Schedule next check-in
        const nextCheckIn: CheckIn = {
          id: generateId(),
          directiveId: directive.id,
          dueAt: nextDueAt,
          response: 'pending',
        };
        await addCheckIn(nextCheckIn);
        const delayMs = Math.max(new Date(nextDueAt).getTime() - Date.now(), 0);
        const notifId = await scheduleNextCheckIn(directive, nextCheckIn.id, { delayMs });
        if (notifId) notifIds.current[directive.id] = notifId;
      }
      // On failure: caller handles next action (start fresh, pause, give up)

      await load();
    },
    [checkIns, directives, load, settings]
  );

  // Quiet check-in: records the response and always advances to the next window,
  // for both success and failure. No completion card, no follow-up choices.
  // Used by the home-card inline buttons and notification action buttons — the
  // latter can fire from a cold start, so we read fresh from storage rather than
  // relying on in-memory state.
  const quickCheckIn = useCallback(
    async (checkInId: string, response: 'success' | 'failure') => {
      const allCheckIns = await getCheckIns();
      const ci = allCheckIns.find((c) => c.id === checkInId);
      // Already resolved (e.g. handled on another surface) or missing — dedupe.
      if (!ci || ci.response !== 'pending') {
        await load();
        return;
      }

      // Cumulative reps after this success — drives the charm celebration.
      const newReps =
        response === 'success' ? repCount(ci.directiveId, allCheckIns) + 1 : 0;
      const unlocked = response === 'success' ? charmUnlockedAt(newReps) : undefined;

      const now = new Date().toISOString();
      await updateCheckIn(checkInId, { response, respondedAt: now });

      const [allDirectives, setts] = await Promise.all([getDirectives(), getAppSettings()]);
      const directive = allDirectives.find((d) => d.id === ci.directiveId);
      if (directive && directive.active) {
        const nextDueAt = nextDueAtFromPreviousDue(ci.dueAt, directive, Date.now(), quietFrom(setts));
        const nextCheckIn: CheckIn = {
          id: generateId(),
          directiveId: directive.id,
          dueAt: nextDueAt,
          response: 'pending',
        };
        await addCheckIn(nextCheckIn);
        const delayMs = Math.max(new Date(nextDueAt).getTime() - Date.now(), 0);
        const notifId = await scheduleNextCheckIn(directive, nextCheckIn.id, { delayMs });
        if (notifId) notifIds.current[directive.id] = notifId;
      }

      await load();

      // A charm unlocked — celebrate it everywhere, even on this quiet path.
      if (unlocked && directive) {
        const fresh = await getCheckIns();
        setCelebration({
          charm: unlocked,
          streak: computeStreak(directive.id, fresh),
          isDo: directive.type === 'DO',
          action: directive.action,
          cleanTimeMinutes:
            directive.type === 'DO'
              ? null
              : newReps * directive.checkInIntervalMinutes,
        });
      }
    },
    [load]
  );

  const scheduleNewInterval = useCallback(
    async (directiveId: string, options?: { force?: boolean }) => {
      const directive = directives.find((d) => d.id === directiveId);
      if (!directive) return;
      if (!directive.active && !options?.force) return;

      const nextCheckIn: CheckIn = {
        id: generateId(),
        directiveId: directive.id,
        dueAt: nextDueAtFromStart(
          Date.now(),
          directive.checkInIntervalMinutes,
          directive.checkInTimeOfDayMinutes,
          quietFrom(settings)
        ),
        response: 'pending',
      };
      await addCheckIn(nextCheckIn);
      const delayMs = Math.max(new Date(nextCheckIn.dueAt).getTime() - Date.now(), 0);
      const notifId = await scheduleNextCheckIn(directive, nextCheckIn.id, { delayMs });
      if (notifId) notifIds.current[directive.id] = notifId;
      await load();
    },
    [directives, load, settings]
  );

  const failCurrentWindow = useCallback(
    async (directiveId: string) => {
      const now = new Date().toISOString();
      const pending = checkIns.find(
        (c) => c.directiveId === directiveId && c.response === 'pending'
      );
      if (!pending) return;

      await updateCheckIn(pending.id, { response: 'failure', respondedAt: now });

      const directive = directives.find((d) => d.id === directiveId);
      if (!directive || !directive.active) {
        await load();
        return;
      }

      const nextCheckIn: CheckIn = {
        id: generateId(),
        directiveId: directive.id,
        dueAt: nextDueAtFromStart(
          Date.now(),
          directive.checkInIntervalMinutes,
          directive.checkInTimeOfDayMinutes,
          quietFrom(settings)
        ),
        response: 'pending',
      };
      await addCheckIn(nextCheckIn);
      const delayMs = Math.max(new Date(nextCheckIn.dueAt).getTime() - Date.now(), 0);
      const notifId = await scheduleNextCheckIn(directive, nextCheckIn.id, { delayMs });
      if (notifId) notifIds.current[directive.id] = notifId;

      await load();
    },
    [checkIns, directives, load, settings]
  );

  const pauseDirective = useCallback(
    async (id: string) => {
      const now = new Date().toISOString();
      await updateDirective(id, { pausedAt: now, active: false });
      // Cancel pending notifications
      if (notifIds.current[id]) {
        await cancelDirectiveNotifications([notifIds.current[id]]);
        delete notifIds.current[id];
      }
      await load();
    },
    [load]
  );

  const resumeDirective = useCallback(
    async (id: string) => {
      const directive = directives.find((d) => d.id === id);
      if (!directive) return;

      const pausedAtMs = directive.pausedAt
        ? new Date(directive.pausedAt).getTime()
        : null;
      const nowMs = Date.now();
      const pausedDurationMs = pausedAtMs ? Math.max(nowMs - pausedAtMs, 0) : 0;

      await updateDirective(id, { active: true, pausedAt: undefined });

      const pending = pendingCheckInForDirective(id, checkIns);
      if (pending) {
        const shiftedDueMs = shiftOutOfQuietHours(
          new Date(pending.dueAt).getTime() + pausedDurationMs,
          quietFrom(settings)
        );
        const shiftedDueAt = new Date(shiftedDueMs).toISOString();
        await updateCheckIn(pending.id, { dueAt: shiftedDueAt });

        const notifId = await scheduleNextCheckIn(
          { ...directive, active: true, pausedAt: undefined },
          pending.id,
          { delayMs: Math.max(shiftedDueMs - nowMs, 0) }
        );
        if (notifId) notifIds.current[id] = notifId;

        await load();
        return;
      }

      await scheduleNewInterval(id, { force: true });
    },
    [checkIns, directives, load, scheduleNewInterval, settings]
  );

  const deleteDirective = useCallback(
    async (id: string) => {
      if (notifIds.current[id]) {
        await cancelDirectiveNotifications([notifIds.current[id]]);
        delete notifIds.current[id];
      }
      await storageDeleteDirective(id);
      await load();
    },
    [load]
  );

  const getStreak = useCallback(
    (directiveId: string) => computeStreak(directiveId, checkIns),
    [checkIns]
  );

  const getDueCheckIn = useCallback(
    (directiveId: string): CheckIn | undefined => {
      const now = Date.now();
      return checkIns.find(
        (c) =>
          c.directiveId === directiveId &&
          c.response === 'pending' &&
          new Date(c.dueAt).getTime() <= now
      );
    },
    [checkIns]
  );

  const getPendingCheckIn = useCallback(
    (directiveId: string): CheckIn | undefined =>
      pendingCheckInForDirective(directiveId, checkIns),
    [checkIns]
  );

  return (
    <AppContext.Provider
      value={{
        directives,
        checkIns,
        settings,
        isLoading,
        addDirective,
        updateDirectiveCheckInTime,
        respondToCheckIn,
        quickCheckIn,
        failCurrentWindow,
        celebration,
        dismissCelebration: () => setCelebration(null),
        updateSettings,
        pauseDirective,
        resumeDirective,
        deleteDirective,
        getStreak,
        getDueCheckIn,
        getPendingCheckIn,
        refresh,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
