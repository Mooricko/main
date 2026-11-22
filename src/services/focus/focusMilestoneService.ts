import { safeStorage } from '../../utils/safeStorage';

export const FOCUS_MILESTONES_STORAGE_KEY = 'adhd_focus_milestones_v1';

export type MilestoneCategory = 'blocks' | 'minutes' | 'streak' | 'special';

export interface FocusMilestone {
  id: string;
  title: string;
  badge: string;
  category: MilestoneCategory;
  description: string;
  target: number;
  unit: string;
  rewardTier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface FocusCompletedSession {
  timestamp: number;
  durationMinutes: number;
  presetLabel?: string;
  wordsRead: number;
  avgWpm: number;
  dateLabel: string;
}

export interface FocusMilestonesData {
  completedBlocksCount: number;
  totalFocusMinutes: number;
  todayBlocksCount: number;
  lastActiveDate: string; // YYYY-MM-DD
  currentStreakDays: number;
  longestStreakDays: number;
  unlockedMilestoneIds: string[];
  lastCompletedSession?: FocusCompletedSession;
}

/**
 * Predefined structured milestones for focus reading sessions.
 */
export const FOCUS_MILESTONES: FocusMilestone[] = [
  {
    id: 'first_spark',
    title: 'First Spark',
    badge: '⚡',
    category: 'blocks',
    description: 'Complete your first structured focus reading block.',
    target: 1,
    unit: 'block',
    rewardTier: 'bronze',
  },
  {
    id: 'dual_focus',
    title: 'Dual Focus',
    badge: '🎯',
    category: 'blocks',
    description: 'Complete 2 focus reading session blocks.',
    target: 2,
    unit: 'blocks',
    rewardTier: 'bronze',
  },
  {
    id: 'flow_trio',
    title: 'Flow Trio',
    badge: '✨',
    category: 'blocks',
    description: 'Complete 3 focus reading session blocks.',
    target: 3,
    unit: 'blocks',
    rewardTier: 'silver',
  },
  {
    id: 'pomodoro_pioneer',
    title: 'Pomodoro Pioneer',
    badge: '🍅',
    category: 'blocks',
    description: 'Complete 5 focus blocks and master structured reading cadence.',
    target: 5,
    unit: 'blocks',
    rewardTier: 'silver',
  },
  {
    id: 'focus_knight',
    title: 'Focus Knight',
    badge: '🛡️',
    category: 'blocks',
    description: 'Complete 10 focus reading blocks.',
    target: 10,
    unit: 'blocks',
    rewardTier: 'gold',
  },
  {
    id: 'deep_flow_master',
    title: 'Flow Master',
    badge: '🌊',
    category: 'blocks',
    description: 'Complete 20 focus reading session blocks.',
    target: 20,
    unit: 'blocks',
    rewardTier: 'gold',
  },
  {
    id: 'grand_scholar',
    title: 'Grand Scholar',
    badge: '👑',
    category: 'blocks',
    description: 'Complete 50 focus reading blocks with sustained dedication.',
    target: 50,
    unit: 'blocks',
    rewardTier: 'platinum',
  },
  {
    id: 'hour_club',
    title: 'Hour of Power',
    badge: '⏱️',
    category: 'minutes',
    description: 'Accumulate 60 minutes of total cognitive focus time.',
    target: 60,
    unit: 'minutes',
    rewardTier: 'silver',
  },
  {
    id: 'marathoner_300',
    title: 'Deep Immersion',
    badge: '🏔️',
    category: 'minutes',
    description: 'Reach 300 minutes (5 hours) of structured reading focus.',
    target: 300,
    unit: 'minutes',
    rewardTier: 'gold',
  },
  {
    id: 'focus_streak_3',
    title: '3-Day Momentum',
    badge: '🔥',
    category: 'streak',
    description: 'Complete focus reading blocks on 3 consecutive days.',
    target: 3,
    unit: 'days',
    rewardTier: 'silver',
  },
  {
    id: 'focus_streak_7',
    title: 'Unstoppable Habit',
    badge: '🌟',
    category: 'streak',
    description: 'Complete focus blocks across a full 7-day streak.',
    target: 7,
    unit: 'days',
    rewardTier: 'platinum',
  },
  {
    id: 'zen_deep_diver',
    title: 'Zen Deep Diver',
    badge: '🧘',
    category: 'special',
    description: 'Finish a deep 25-minute or 30-minute predefined focus block.',
    target: 25,
    unit: 'min block',
    rewardTier: 'gold',
  },
  {
    id: 'speed_demon_block',
    title: 'Word Dynamo',
    badge: '🚀',
    category: 'special',
    description: 'Read 350+ words in a single focus reading block.',
    target: 350,
    unit: 'words',
    rewardTier: 'gold',
  },
];

function getTodayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getYesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DEFAULT_FOCUS_DATA: FocusMilestonesData = {
  completedBlocksCount: 0,
  totalFocusMinutes: 0,
  todayBlocksCount: 0,
  lastActiveDate: '',
  currentStreakDays: 0,
  longestStreakDays: 0,
  unlockedMilestoneIds: [],
};

/**
 * Retrieves the current persisted focus milestones data.
 */
export function getFocusMilestonesData(): FocusMilestonesData {
  try {
    const raw = safeStorage.getItem(FOCUS_MILESTONES_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_FOCUS_DATA };
    const parsed = JSON.parse(raw);
    const today = getTodayKey();
    const yesterday = getYesterdayKey();

    // Check if daily counter needs a reset for a new day
    let todayBlocksCount = parsed.todayBlocksCount ?? 0;
    let currentStreakDays = parsed.currentStreakDays ?? 0;

    if (parsed.lastActiveDate !== today) {
      if (parsed.lastActiveDate === yesterday) {
        // Consecutive day; preserve streak
        todayBlocksCount = 0;
      } else if (parsed.lastActiveDate) {
        // Streak broken
        todayBlocksCount = 0;
        currentStreakDays = 0;
      }
    }

    return {
      completedBlocksCount: parsed.completedBlocksCount ?? 0,
      totalFocusMinutes: parsed.totalFocusMinutes ?? 0,
      todayBlocksCount,
      lastActiveDate: parsed.lastActiveDate ?? '',
      currentStreakDays,
      longestStreakDays: parsed.longestStreakDays ?? 0,
      unlockedMilestoneIds: Array.isArray(parsed.unlockedMilestoneIds) ? parsed.unlockedMilestoneIds : [],
      lastCompletedSession: parsed.lastCompletedSession,
    };
  } catch (err) {
    console.warn('[FocusMilestoneService] Failed to load milestones:', err);
    return { ...DEFAULT_FOCUS_DATA };
  }
}

/**
 * Saves updated milestones data to storage.
 */
export function saveFocusMilestonesData(data: FocusMilestonesData): void {
  try {
    safeStorage.setItem(FOCUS_MILESTONES_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('[FocusMilestoneService] Failed to save milestones:', err);
  }
}

/**
 * Evaluates which milestones are currently qualified based on state.
 */
function evaluateUnlockedMilestones(
  stats: FocusMilestonesData,
  lastSession?: { durationMinutes: number; wordsRead: number }
): string[] {
  const unlocked = new Set<string>(stats.unlockedMilestoneIds);

  for (const m of FOCUS_MILESTONES) {
    if (unlocked.has(m.id)) continue;

    let satisfied = false;
    switch (m.id) {
      case 'first_spark':
        satisfied = stats.completedBlocksCount >= 1;
        break;
      case 'dual_focus':
        satisfied = stats.completedBlocksCount >= 2;
        break;
      case 'flow_trio':
        satisfied = stats.completedBlocksCount >= 3;
        break;
      case 'pomodoro_pioneer':
        satisfied = stats.completedBlocksCount >= 5;
        break;
      case 'focus_knight':
        satisfied = stats.completedBlocksCount >= 10;
        break;
      case 'deep_flow_master':
        satisfied = stats.completedBlocksCount >= 20;
        break;
      case 'grand_scholar':
        satisfied = stats.completedBlocksCount >= 50;
        break;
      case 'hour_club':
        satisfied = stats.totalFocusMinutes >= 60;
        break;
      case 'marathoner_300':
        satisfied = stats.totalFocusMinutes >= 300;
        break;
      case 'focus_streak_3':
        satisfied = stats.currentStreakDays >= 3;
        break;
      case 'focus_streak_7':
        satisfied = stats.currentStreakDays >= 7;
        break;
      case 'zen_deep_diver':
        satisfied = (lastSession?.durationMinutes ?? 0) >= 25;
        break;
      case 'speed_demon_block':
        satisfied = (lastSession?.wordsRead ?? 0) >= 350;
        break;
    }

    if (satisfied) {
      unlocked.add(m.id);
    }
  }

  return Array.from(unlocked);
}

/**
 * Called when a user completes a predefined focus session block.
 * Updates stats, checks streak, saves to storage, and detects newly unlocked milestones.
 */
export function recordFocusBlockCompleted(session: {
  durationMinutes: number;
  presetLabel?: string;
  wordsRead: number;
  avgWpm: number;
}): {
  data: FocusMilestonesData;
  newlyUnlocked: FocusMilestone[];
  allMilestones: { milestone: FocusMilestone; isUnlocked: boolean; progressPercent: number }[];
} {
  const current = getFocusMilestonesData();
  const today = getTodayKey();
  const yesterday = getYesterdayKey();

  let streak = current.currentStreakDays;
  if (current.lastActiveDate === today) {
    // Already active today; streak unchanged
  } else if (current.lastActiveDate === yesterday) {
    // Consecutive day!
    streak += 1;
  } else {
    // First day or streak restarted
    streak = 1;
  }

  const todayBlocks = (current.lastActiveDate === today ? current.todayBlocksCount : 0) + 1;
  const completedBlocks = current.completedBlocksCount + 1;
  const totalMinutes = current.totalFocusMinutes + Math.max(1, session.durationMinutes);
  const longestStreak = Math.max(current.longestStreakDays, streak);

  const completedSessionRecord: FocusCompletedSession = {
    timestamp: Date.now(),
    durationMinutes: session.durationMinutes,
    presetLabel: session.presetLabel || `${session.durationMinutes}m Focus Block`,
    wordsRead: session.wordsRead,
    avgWpm: session.avgWpm,
    dateLabel: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
  };

  const updatedStats: FocusMilestonesData = {
    completedBlocksCount: completedBlocks,
    totalFocusMinutes: totalMinutes,
    todayBlocksCount: todayBlocks,
    lastActiveDate: today,
    currentStreakDays: streak,
    longestStreakDays: longestStreak,
    unlockedMilestoneIds: current.unlockedMilestoneIds,
    lastCompletedSession: completedSessionRecord,
  };

  const previouslyUnlocked = new Set(current.unlockedMilestoneIds);
  const newUnlockedIds = evaluateUnlockedMilestones(updatedStats, {
    durationMinutes: session.durationMinutes,
    wordsRead: session.wordsRead,
  });

  updatedStats.unlockedMilestoneIds = newUnlockedIds;
  saveFocusMilestonesData(updatedStats);

  // Identify only the milestones that were unlocked during this specific session
  const newlyUnlocked = FOCUS_MILESTONES.filter(
    (m) => newUnlockedIds.includes(m.id) && !previouslyUnlocked.has(m.id)
  );

  const allMilestones = getAllMilestonesProgress(updatedStats);

  return {
    data: updatedStats,
    newlyUnlocked,
    allMilestones,
  };
}

/**
 * Calculates current progress for all milestones.
 */
export function getAllMilestonesProgress(stats: FocusMilestonesData): {
  milestone: FocusMilestone;
  isUnlocked: boolean;
  currentValue: number;
  progressPercent: number;
}[] {
  return FOCUS_MILESTONES.map((m) => {
    const isUnlocked = stats.unlockedMilestoneIds.includes(m.id);
    let currentValue = 0;

    switch (m.category) {
      case 'blocks':
        currentValue = stats.completedBlocksCount;
        break;
      case 'minutes':
        currentValue = stats.totalFocusMinutes;
        break;
      case 'streak':
        currentValue = stats.currentStreakDays;
        break;
      case 'special':
        currentValue = isUnlocked ? m.target : 0;
        break;
    }

    const progressPercent = isUnlocked
      ? 100
      : Math.min(100, Math.round((currentValue / Math.max(1, m.target)) * 100));

    return {
      milestone: m,
      isUnlocked,
      currentValue,
      progressPercent,
    };
  });
}

/**
 * Finds the next closest milestone for the reader to achieve.
 */
export function getNextUpcomingMilestone(stats: FocusMilestonesData): {
  milestone: FocusMilestone;
  currentValue: number;
  remaining: number;
  progressPercent: number;
} | null {
  const list = getAllMilestonesProgress(stats).filter((item) => !item.isUnlocked);
  if (list.length === 0) return null;

  // Sort by highest progress percentage
  list.sort((a, b) => b.progressPercent - a.progressPercent);
  const closest = list[0];

  return {
    milestone: closest.milestone,
    currentValue: closest.currentValue,
    remaining: Math.max(0, closest.milestone.target - closest.currentValue),
    progressPercent: closest.progressPercent,
  };
}
