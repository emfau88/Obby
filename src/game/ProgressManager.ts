import { LEVELS, type LevelDefinition } from './LevelData';

const STORAGE_KEY = 'cloudtop-progress-v1';

export type LevelProgress = {
  completed: boolean;
  bestTime: number;
  bestCoins: number;
  fewestFalls: number;
  stars: number;
};

export type GameProgress = {
  unlocked: string[];
  levels: Record<string, LevelProgress>;
};

function emptyProgress(): GameProgress {
  return { unlocked: [LEVELS[0].id], levels: {} };
}

export function starsFor(level: LevelDefinition, time: number, coins: number, falls: number) {
  return 1
    + (coins >= level.mastery.coins ? 1 : 0)
    + (time < level.mastery.time && falls <= level.mastery.falls ? 1 : 0);
}

export function loadProgress(): GameProgress {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '') as Partial<GameProgress>;
    const unlocked = Array.isArray(parsed.unlocked)
      ? parsed.unlocked.filter(id => LEVELS.some(level => level.id === id))
      : [];
    if (!unlocked.includes(LEVELS[0].id)) unlocked.unshift(LEVELS[0].id);
    return {
      unlocked,
      levels: parsed.levels && typeof parsed.levels === 'object' ? parsed.levels : {},
    };
  } catch {
    return emptyProgress();
  }
}

export function saveResult(level: LevelDefinition, time: number, coins: number, falls: number) {
  const progress = loadProgress();
  const previous = progress.levels[level.id];
  const result: LevelProgress = {
    completed: true,
    bestTime: Math.min(previous?.bestTime ?? Number.POSITIVE_INFINITY, time),
    bestCoins: Math.max(previous?.bestCoins ?? 0, coins),
    fewestFalls: Math.min(previous?.fewestFalls ?? Number.POSITIVE_INFINITY, falls),
    stars: Math.max(previous?.stars ?? 0, starsFor(level, time, coins, falls)),
  };
  progress.levels[level.id] = result;
  if (level.nextId && !progress.unlocked.includes(level.nextId)) progress.unlocked.push(level.nextId);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch { /* Progress remains optional. */ }
  return { progress, result };
}
