import React from 'react';
import { Match, Player } from '../types';
import { getPositionName } from '../utils/formatters';
import { 
  Trophy, 
  Flame, 
  Award, 
  Target, 
  ShieldCheck, 
  Users, 
  Sparkles,
  Medal,
  Activity,
  Star,
  ShieldAlert
} from 'lucide-react';

interface StatsViewProps {
  matches: Match[];
  players: Player[];
}

export const StatsView: React.FC<StatsViewProps> = ({ matches, players }) => {
  const playerMap = new Map(players.map(p => [p.id, p]));
  const finishedMatches = matches.filter(m => m.status === 'finished');

  // Compute team records
  let totalGoalsHome = 0;
  let totalGoalsAway = 0;
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let cleanSheets = 0;

  finishedMatches.forEach(m => {
    totalGoalsHome += m.homeScore;
    totalGoalsAway += m.awayScore;
    if (m.homeScore > m.awayScore) wins++;
    else if (m.homeScore === m.awayScore) draws++;
    else losses++;

    if (m.awayScore === 0) cleanSheets++;
  });

  const winRate = finishedMatches.length > 0 ? Math.round((wins / finishedMatches.length) * 100) : 0;
  const avgGoalsPerGame = finishedMatches.length > 0 ? (totalGoalsHome / finishedMatches.length).toFixed(1) : '0';

  // Compute player individual stats
  interface PlayerAggStats {
    player: Player;
    goals: number;
    assists: number;
    appearances: number;
    mvpCount: number;
    yellowCards: number;
    redCards: number;
  }

  const playerStatsMap = new Map<string, PlayerAggStats>();

  players.forEach(p => {
    playerStatsMap.set(p.id, {
      player: p,
      goals: 0,
      assists: 0,
      appearances: 0,
      mvpCount: 0,
      yellowCards: 0,
      redCards: 0,
    });
  });

  matches.forEach(m => {
    (m.squadPlayerIds || []).forEach(pId => {
      const entry = playerStatsMap.get(pId);
      if (entry) entry.appearances++;
    });

    (m.goals || []).forEach(g => {
      const scorer = playerStatsMap.get(g.playerId);
      if (scorer) scorer.goals++;

      if (g.assistPlayerId) {
        const assist = playerStatsMap.get(g.assistPlayerId);
        if (assist) assist.assists++;
      }
    });

    (m.cards || []).forEach(c => {
      const carded = playerStatsMap.get(c.playerId);
      if (carded) {
        if (c.type === 'yellow') carded.yellowCards++;
        if (c.type === 'red') carded.redCards++;
      }
    });

    if (m.mvpPlayerId) {
      const mvp = playerStatsMap.get(m.mvpPlayerId);
      if (mvp) mvp.mvpCount++;
    }
  });

  const allStats = Array.from(playerStatsMap.values());

  // Top Scorers
  const topScorers = [...allStats].filter(s => s.goals > 0).sort((a, b) => b.goals - a.goals);
  
  // Top Assists
  const topAssists = [...allStats].filter(s => s.assists > 0).sort((a, b) => b.assists - a.assists);

  // Top Appearances
  const topAppearances = [...allStats].sort((a, b) => b.appearances - a.appearances);

  // Top MVPs
  const topMvps = [...allStats].filter(s => s.mvpCount > 0).sort((a, b) => b.mvpCount - a.mvpCount);

  return (
    <div className="space-y-6">
      
      {/* Overall Team Performance Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-[11px] text-slate-400 block font-medium">ការប្រកួតបានបញ្ចប់</span>
          <span className="text-2xl font-black text-white mt-1 block">{finishedMatches.length}</span>
          <span className="text-[10px] text-slate-500">{matches.length} ប្រកួតសរុប</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-[11px] text-slate-400 block font-medium">កំណត់ត្រា (W-D-L)</span>
          <span className="text-2xl font-black text-white mt-1 block">
            <span className="text-emerald-400">{wins}</span>-<span className="text-amber-400">{draws}</span>-<span className="text-rose-400">{losses}</span>
          </span>
          <span className="text-[10px] text-slate-500">ឈ្នះ-ស្មើ-ចាញ់</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-[11px] text-slate-400 block font-medium">អត្រាឈ្នះ (Win Rate)</span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">{winRate}%</span>
          <span className="text-[10px] text-slate-500">{wins} លើ {finishedMatches.length} ប្រកួត</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-[11px] text-slate-400 block font-medium">គ្រាប់បាល់ស៊ុតបាន</span>
          <span className="text-2xl font-black text-blue-400 mt-1 block">{totalGoalsHome}</span>
          <span className="text-[10px] text-slate-500">មធ្យម {avgGoalsPerGame} គ្រាប់/ប្រកួត</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-[11px] text-slate-400 block font-medium">គ្រាប់បាល់របូត</span>
          <span className="text-2xl font-black text-rose-400 mt-1 block">{totalGoalsAway}</span>
          <span className="text-[10px] text-slate-500">ផលសង: {totalGoalsHome - totalGoalsAway >= 0 ? '+' : ''}{totalGoalsHome - totalGoalsAway}</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-[11px] text-slate-400 block font-medium">មិនឱ្យរបូតគ្រាប់ (Clean Sheets)</span>
          <span className="text-2xl font-black text-amber-400 mt-1 block">{cleanSheets}</span>
          <span className="text-[10px] text-slate-500">អ្នកចាំទីការពារសំណាញ់</span>
        </div>

      </div>

      {/* Leaderboards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Scorers (Golden Boot) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              តារាងអ្នកស៊ុតបញ្ចូលទីច្រើនជាងគេ (Top Scorers)
            </h4>
            <span className="text-xs text-amber-400 font-bold font-mono">⚽ {totalGoalsHome} គ្រាប់</span>
          </div>

          {topScorers.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">មិនទាន់មានការកត់ត្រាគ្រាប់បាល់នៅឡើយទេ</p>
          ) : (
            <div className="space-y-2">
              {topScorers.map((st, idx) => {
                const pos = getPositionName(st.player.position);
                const isTop1 = idx === 0;

                return (
                  <div
                    key={st.player.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                      isTop1 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        idx === 0 ? 'bg-amber-400 text-slate-950 font-black' : idx === 1 ? 'bg-slate-300 text-slate-950' : idx === 2 ? 'bg-amber-700 text-white' : 'text-slate-500'
                      }`}>
                        {idx + 1}
                      </span>

                      <img
                        src={st.player.photo}
                        alt={st.player.name}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-700 bg-slate-800 shrink-0"
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[11px] font-bold text-blue-400">{st.player.code}</span>
                          <span className="text-xs font-bold text-white truncate">
                            #{st.player.number} {st.player.name}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {pos.labelKh} • {st.appearances} ប្រកួត
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base font-black text-amber-400 font-mono">
                        {st.goals} គ្រាប់
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {(st.goals / (st.appearances || 1)).toFixed(1)} គ្រាប់/ប្រកួត
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Assists (Playmakers) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              តារាងអ្នកបញ្ជូនបាល់ច្រើនជាងគេ (Top Assists)
            </h4>
            <span className="text-xs text-blue-400 font-bold">👟 បញ្ជូនគ្រាប់បាល់</span>
          </div>

          {topAssists.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">មិនទាន់មានការកត់ត្រាការបញ្ជូនបាល់នៅឡើយទេ</p>
          ) : (
            <div className="space-y-2">
              {topAssists.map((st, idx) => {
                const pos = getPositionName(st.player.position);

                return (
                  <div key={st.player.id} className="p-3 rounded-xl border bg-slate-950/60 border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs text-slate-400 shrink-0">
                        {idx + 1}
                      </span>

                      <img
                        src={st.player.photo}
                        alt={st.player.name}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-700 bg-slate-800 shrink-0"
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[11px] font-bold text-blue-400">{st.player.code}</span>
                          <span className="text-xs font-bold text-white truncate">
                            #{st.player.number} {st.player.name}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {pos.labelKh}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base font-black text-blue-400 font-mono">
                        {st.assists} បញ្ជូន
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Secondary Stats: Most Appearances & MVPs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Most Appearances */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              វត្តមានចូលរួមប្រកួតច្រើនជាងគេ (Appearances)
            </h4>
          </div>

          <div className="space-y-2">
            {topAppearances.slice(0, 5).map((st, idx) => (
              <div key={st.player.id} className="p-2.5 rounded-xl border bg-slate-950/60 border-slate-800 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-slate-500 font-bold w-4 text-center">{idx + 1}</span>
                  <img src={st.player.photo} alt={st.player.name} className="w-8 h-8 rounded-lg object-cover" />
                  <div className="min-w-0">
                    <span className="font-bold text-white block truncate">#{st.player.number} {st.player.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{st.player.code}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-emerald-400 font-mono text-sm">{st.appearances} ប្រកួត</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Most Valuable Players (MVP Awards) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              កីឡាករឆ្នើមប្រចាំការប្រកួត (MVP Awards)
            </h4>
          </div>

          {topMvps.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">មិនទាន់មានការជ្រើសរើស MVP នៅឡើយទេ</p>
          ) : (
            <div className="space-y-2">
              {topMvps.map((st, idx) => (
                <div key={st.player.id} className="p-2.5 rounded-xl border bg-slate-950/60 border-slate-800 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-amber-400 font-bold w-4 text-center">★</span>
                    <img src={st.player.photo} alt={st.player.name} className="w-8 h-8 rounded-lg object-cover" />
                    <div className="min-w-0">
                      <span className="font-bold text-white block truncate">#{st.player.number} {st.player.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{st.player.code}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-amber-400 font-mono text-sm">{st.mvpCount} ដង (MVP)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
