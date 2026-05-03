// Track player stats across sessions in localStorage.
const KEY = 'lechia_stats';

const DEFAULTS = { games: 0, wins: 0, totalScore: 0, knights: 0, longestRoad: 0 };

export function loadStats() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export function recordGameEnd({ won, score, knights, longestRoad }) {
  const cur = loadStats();
  const next = {
    games: cur.games + 1,
    wins: cur.wins + (won ? 1 : 0),
    totalScore: cur.totalScore + (score || 0),
    knights: cur.knights + (knights || 0),
    longestRoad: Math.max(cur.longestRoad, longestRoad || 0),
  };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function avgScore(stats) {
  return stats.games > 0 ? (stats.totalScore / stats.games).toFixed(1) : '—';
}

export function winRate(stats) {
  return stats.games > 0 ? Math.round((stats.wins / stats.games) * 100) + '%' : '—';
}
