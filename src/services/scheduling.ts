import { CheckIn, Directive } from '../types';

const MINUTES_PER_DAY = 1440;

function setLocalMinutesOfDay(baseMs: number, minutesOfDay: number): number {
  const d = new Date(baseMs);
  const hours = Math.floor(minutesOfDay / 60);
  const minutes = minutesOfDay % 60;
  d.setHours(hours, minutes, 0, 0);
  return d.getTime();
}

export function supportsTimeOfDay(intervalMinutes: number): boolean {
  return intervalMinutes >= MINUTES_PER_DAY && intervalMinutes % MINUTES_PER_DAY === 0;
}

// ─── Quiet hours ───────────────────────────────────────────────────────────────
// A nightly window during which no check-in should come due. Any due time that
// would land inside it is pushed to the end of the window (the morning), so the
// overnight period folds into a single window resolved when the user wakes.

export interface QuietHours {
  enabled: boolean;
  startMinutes: number; // local minutes after midnight, e.g. 1320 = 22:00
  endMinutes: number;   // e.g. 420 = 07:00
}

export function isInQuietHours(ms: number, quiet?: QuietHours): boolean {
  if (!quiet || !quiet.enabled) return false;
  const d = new Date(ms);
  const t = d.getHours() * 60 + d.getMinutes();
  const { startMinutes: s, endMinutes: e } = quiet;
  // A window can wrap midnight (start > end, e.g. 22:00 → 07:00).
  return s > e ? t >= s || t < e : t >= s && t < e;
}

/** If `ms` lands in quiet hours, move it to the next end-of-quiet (morning). */
export function shiftOutOfQuietHours(ms: number, quiet?: QuietHours): number {
  if (!isInQuietHours(ms, quiet)) return ms;
  let endMs = setLocalMinutesOfDay(ms, quiet!.endMinutes);
  if (endMs <= ms) endMs += MINUTES_PER_DAY * 60 * 1000;
  return endMs;
}

export function nextDueAtFromStart(
  startMs: number,
  intervalMinutes: number,
  checkInTimeOfDayMinutes?: number,
  quiet?: QuietHours
): string {
  const intervalMs = intervalMinutes * 60 * 1000;

  let dueMs: number;
  if (checkInTimeOfDayMinutes === undefined || checkInTimeOfDayMinutes === null) {
    // No clock anchor — first window is simply one interval out from the start.
    dueMs = startMs + intervalMs;
  } else {
    const anchorMs = setLocalMinutesOfDay(startMs, checkInTimeOfDayMinutes);
    if (supportsTimeOfDay(intervalMinutes)) {
      // Daily-or-longer cadence: the check-in recurs at this exact clock time.
      dueMs = anchorMs <= startMs ? anchorMs + MINUTES_PER_DAY * 60 * 1000 : anchorMs;
    } else {
      // Sub-daily cadence: the anchor sets the *phase* of the schedule. The first
      // check-in is the next slot on the grid { anchor + k·interval } strictly
      // after the start, so windows land at consistent clock-aligned times no
      // matter when the commitment was created.
      const k = Math.floor((startMs - anchorMs) / intervalMs) + 1;
      dueMs = anchorMs + k * intervalMs;
    }
  }

  return new Date(shiftOutOfQuietHours(dueMs, quiet)).toISOString();
}

export function nextDueAtFromPreviousDue(
  previousDueAt: string,
  directive: Directive,
  nowMs: number = Date.now(),
  quiet?: QuietHours
): string {
  const intervalMs = directive.checkInIntervalMinutes * 60 * 1000;
  let nextMs = new Date(previousDueAt).getTime() + intervalMs;

  // Keep cadence stable while avoiding instantly overdue check-ins after late responses.
  while (nextMs <= nowMs) {
    nextMs += intervalMs;
  }

  return new Date(shiftOutOfQuietHours(nextMs, quiet)).toISOString();
}

/**
 * How long after a check-in's deadline it stays actionable before it auto-fails.
 * Half the cadence feels fair across scales, clamped to a sane band so very short
 * intervals still get a usable window and very long ones don't drag on for days.
 */
export function graceMsFor(intervalMinutes: number): number {
  const intervalMs = intervalMinutes * 60 * 1000;
  const FIVE_MIN = 5 * 60 * 1000;
  const TWELVE_H = 12 * 60 * 60 * 1000;
  return Math.min(Math.max(intervalMs / 2, FIVE_MIN), TWELVE_H);
}

/**
 * The true start of the currently-pending window: the previous window's deadline,
 * or the directive's start if this is the first. Using the real boundaries (rather
 * than assuming every window is exactly one interval) keeps the live countdown
 * honest when a window was stretched — e.g. deferred past quiet hours, anchored,
 * or extended after a late response.
 */
export function windowStartMs(
  directive: Directive,
  pendingDueAtMs: number,
  checkIns: CheckIn[]
): number {
  let prev = -Infinity;
  for (const c of checkIns) {
    if (c.directiveId !== directive.id) continue;
    const d = new Date(c.dueAt).getTime();
    if (d < pendingDueAtMs && d > prev) prev = d;
  }
  if (prev !== -Infinity) return prev;
  return directive.startAt
    ? new Date(directive.startAt).getTime()
    : new Date(directive.createdAt).getTime();
}

export function defaultTimeOfDayMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function formatTimeOfDay(minutesOfDay: number): string {
  const d = new Date();
  const hours = Math.floor(minutesOfDay / 60);
  const minutes = minutesOfDay % 60;
  d.setHours(hours, minutes, 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
