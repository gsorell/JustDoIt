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
  cancelDirectiveNotifications,
  requestNotificationPermissions,
  scheduleNextCheckIn,
} from '../services/notifications';

interface NewDirectivePayload {
  type: DirectiveType;
  action: string;
  durationDays: number | null;
  checkInIntervalMinutes: number;
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
  respondToCheckIn: (checkInId: string, response: 'success' | 'failure') => Promise<void>;
  failCurrentWindow: (directiveId: string) => Promise<void>;
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

  // Map of directiveId -> notification identifier
  const notifIds = useRef<Record<string, string>>({});

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

  useEffect(() => {
    load().finally(() => setIsLoading(false));
  }, [load]);

  // Refresh on foreground
  useEffect(() => {
    const sub = AppState.addEventListener(
      'change',
      (state: AppStateStatus) => {
        if (state === 'active') load();
      }
    );
    return () => sub.remove();
  }, [load]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

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
        dueAt: new Date(
          effectiveStartMs + payload.checkInIntervalMinutes * 60 * 1000
        ).toISOString(),
        response: 'pending',
      };
      await addCheckIn(checkIn);

      const notifId = await scheduleNextCheckIn(directive, checkIn.id);
      if (notifId) notifIds.current[directive.id] = notifId;

      await load();
    },
    [load]
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
        // Schedule next check-in
        const nextCheckIn: CheckIn = {
          id: generateId(),
          directiveId: directive.id,
          dueAt: new Date(
            Date.now() + directive.checkInIntervalMinutes * 60 * 1000
          ).toISOString(),
          response: 'pending',
        };
        await addCheckIn(nextCheckIn);
        const notifId = await scheduleNextCheckIn(directive, nextCheckIn.id);
        if (notifId) notifIds.current[directive.id] = notifId;
      }
      // On failure: caller handles next action (start fresh, pause, give up)

      await load();
    },
    [checkIns, directives, load]
  );

  const scheduleNewInterval = useCallback(
    async (directiveId: string, options?: { force?: boolean }) => {
      const directive = directives.find((d) => d.id === directiveId);
      if (!directive) return;
      if (!directive.active && !options?.force) return;

      const nextCheckIn: CheckIn = {
        id: generateId(),
        directiveId: directive.id,
        dueAt: new Date(
          Date.now() + directive.checkInIntervalMinutes * 60 * 1000
        ).toISOString(),
        response: 'pending',
      };
      await addCheckIn(nextCheckIn);
      const notifId = await scheduleNextCheckIn(directive, nextCheckIn.id);
      if (notifId) notifIds.current[directive.id] = notifId;
      await load();
    },
    [directives, load]
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
        dueAt: new Date(
          Date.now() + directive.checkInIntervalMinutes * 60 * 1000
        ).toISOString(),
        response: 'pending',
      };
      await addCheckIn(nextCheckIn);
      const notifId = await scheduleNextCheckIn(directive, nextCheckIn.id);
      if (notifId) notifIds.current[directive.id] = notifId;

      await load();
    },
    [checkIns, directives, load]
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
        const shiftedDueMs =
          new Date(pending.dueAt).getTime() + pausedDurationMs;
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
    [checkIns, directives, load, scheduleNewInterval]
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
        respondToCheckIn,
        failCurrentWindow,
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
