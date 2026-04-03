export type DirectiveType = 'DO' | 'DONT';
export type CheckInResponse = 'success' | 'failure' | 'skipped' | 'pending';

export interface Directive {
  id: string;
  type: DirectiveType;
  action: string;
  durationDays: number | null; // null = forever (used when no explicit endAt)
  checkInIntervalMinutes: number;
  carryForward: boolean;
  createdAt: string; // ISO datetime
  active: boolean;
  pausedAt?: string;  // ISO datetime if paused
  startAt?: string;   // ISO datetime — if set and future, defers first check-in
  endAt?: string;     // ISO datetime — explicit end; overrides durationDays
}

export interface CheckIn {
  id: string;
  directiveId: string;
  dueAt: string; // ISO - when scheduled
  respondedAt?: string; // ISO - when user responded
  response: CheckInResponse;
}

export interface AppSettings {
  hasCompletedOnboarding: boolean;
  notificationsEnabled: boolean;
}

export type RootStackParamList = {
  Home: undefined;
  AddDirective: undefined;
  DirectiveDetail: { directiveId: string };
  CheckIn: { directiveId: string; checkInId: string };
};
