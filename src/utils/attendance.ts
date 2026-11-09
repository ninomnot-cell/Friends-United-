import { Match, Player } from '../types';

export interface PlayerAttendanceSummary {
  playerId: string;
  totalTeamMatches: number;
  attendedCount: number;
  missedCount: number;
  consecutiveMissed: number; // ចំនួនប្រកួតអវត្តមានជាប់ៗគ្នាចុងក្រោយ
  attendanceRate: number;
  isEligibleForDismissal: boolean; // អវត្តមាន ៦ ប្រកួតជាប់ៗគ្នា (consecutiveMissed >= threshold)
  isAtRiskWarning: boolean; // អវត្តមាន ៤ ឬ ៥ ប្រកួតជាប់ៗគ្នា (ជិតដល់ ៦ ប្រកួត)
  threshold: number;
  missedMatchesList: Match[];
  attendedMatchesList: Match[];
}

/**
 * Computes attendance and consecutive absence metrics for a player across all matches.
 * According to club disciplinary rules:
 * - A player who misses 6 consecutive matches in a row ("អវត្តមាន ៦ ប្រកួតជាប់ៗគ្នា") is eligible to be dismissed from the team.
 * @param player The player to check
 * @param matches All matches in the system
 * @param threshold Consecutive missed matches to trigger dismissal (default 6)
 */
export function calculatePlayerAttendance(
  player: Player,
  matches: Match[],
  threshold: number = 6
): PlayerAttendanceSummary {
  // Sort matches chronologically
  const sortedMatches = [...matches]
    .filter(m => m.status === 'finished' || m.status === 'live' || m.status === 'scheduled')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const attendedMatchesList: Match[] = [];
  const missedMatchesList: Match[] = [];

  sortedMatches.forEach(m => {
    const wasInSquad = m.squadPlayerIds?.includes(player.id);
    if (wasInSquad) {
      attendedMatchesList.push(m);
    } else {
      missedMatchesList.push(m);
    }
  });

  // Calculate consecutive missed matches counting backwards from the most recent match
  // finished / live matches carry definitive presence, scheduled may also be included if past or squad set
  let consecutiveMissed = 0;
  for (let i = sortedMatches.length - 1; i >= 0; i--) {
    const m = sortedMatches[i];
    if (!m.squadPlayerIds?.includes(player.id)) {
      consecutiveMissed++;
    } else {
      break;
    }
  }

  const totalTeamMatches = sortedMatches.length;
  const attendedCount = attendedMatchesList.length;
  const missedCount = missedMatchesList.length;

  const attendanceRate = totalTeamMatches > 0 
    ? Math.round((attendedCount / totalTeamMatches) * 100) 
    : 100;

  // Strict disciplinary rule: A player is eligible for dismissal ONLY when they are absent
  // for 6 consecutive matches (consecutiveMissed >= threshold).
  const isEligibleForDismissal = consecutiveMissed >= threshold;

  // Warning state: player has missed 4 or 5 consecutive matches, approaching the 6-match threshold
  const isAtRiskWarning = consecutiveMissed >= 4 && consecutiveMissed < threshold;

  return {
    playerId: player.id,
    totalTeamMatches,
    attendedCount,
    missedCount,
    consecutiveMissed,
    attendanceRate,
    isEligibleForDismissal,
    isAtRiskWarning,
    threshold,
    missedMatchesList,
    attendedMatchesList,
  };
}

/**
 * Returns all players who meet the consecutive absence threshold (6 matches in a row)
 * and are eligible for dismissal from the team.
 */
export function getPlayersAtRiskOfDismissal(
  players: Player[],
  matches: Match[],
  threshold: number = 6
): { player: Player; summary: PlayerAttendanceSummary }[] {
  return players
    .filter(p => p.status !== 'dismissed')
    .map(p => ({
      player: p,
      summary: calculatePlayerAttendance(p, matches, threshold),
    }))
    .filter(item => item.summary.isEligibleForDismissal)
    .sort((a, b) => b.summary.consecutiveMissed - a.summary.consecutiveMissed);
}

/**
 * Returns all players with consecutive absence warning (4 to 5 matches in a row)
 */
export function getPlayersInWarningState(
  players: Player[],
  matches: Match[],
  threshold: number = 6
): { player: Player; summary: PlayerAttendanceSummary }[] {
  return players
    .filter(p => p.status !== 'dismissed')
    .map(p => ({
      player: p,
      summary: calculatePlayerAttendance(p, matches, threshold),
    }))
    .filter(item => item.summary.isAtRiskWarning)
    .sort((a, b) => b.summary.consecutiveMissed - a.summary.consecutiveMissed);
}
