import React, { useState } from 'react';
import { ClubSettings, Match, Player } from '../types';
import { formatCurrency, formatDateKh, calculateMatchFinance, getMatchVoteAnalysis } from '../utils/formatters';
import { getPlayersAtRiskOfDismissal } from '../utils/attendance';
import { getSavedSyncConfig } from '../services/googleSheets';
import { MatchShareModal } from './MatchShareModal';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Wallet, 
  Trophy, 
  ChevronRight, 
  PlusCircle, 
  CheckCircle2, 
  AlertCircle, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  AlertTriangle,
  UserX,
  FileSpreadsheet,
  ExternalLink,
  Share2,
  ThumbsUp,
  Send
} from 'lucide-react';

interface DashboardViewProps {
  settings: ClubSettings;
  players: Player[];
  matches: Match[];
  onOpenNewMatch: () => void;
  onOpenNewPlayer: () => void;
  onSelectMatch: (match: Match) => void;
  onNavigateTab: (tab: 'players' | 'matches' | 'finances' | 'stats') => void;
  onOpenGoogleSheets: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  settings,
  players,
  matches,
  onOpenNewMatch,
  onOpenNewPlayer,
  onSelectMatch,
  onNavigateTab,
  onOpenGoogleSheets,
}) => {
  const [shareMatch, setShareMatch] = useState<Match | null>(null);

  // Find upcoming match
  const upcomingMatches = matches
    .filter(m => m.status === 'scheduled' || m.status === 'live')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const nextMatch = upcomingMatches[0];
  const nextMatchAnalysis = nextMatch ? getMatchVoteAnalysis(nextMatch, players) : null;

  // Recent finished matches
  const recentFinished = matches
    .filter(m => m.status === 'finished')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  // Calculate treasury
  let totalIncome = 0;
  let totalExpense = 0;
  let totalPendingDebt = 0;
  const playerMap = new Map(players.map(p => [p.id, p]));

  matches.forEach(m => {
    (m.squadPlayerIds || []).forEach(pId => {
      const fee = m.playerFees?.[pId];
      const p = playerMap.get(pId);
      const isGK = p?.position === 'GK' || fee?.isExempt;

      if (fee?.hasPaid) {
        totalIncome += fee.amount || m.feePerPlayer;
      } else if (!isGK) {
        // Goalkeepers are exempt from fees
        totalPendingDebt += m.feePerPlayer;
      }
    });
    (m.expenses || []).forEach(e => {
      totalExpense += e.amount || 0;
    });
  });

  const netBalance = totalIncome - totalExpense;

  // Top scorer calculation
  const goalsPerPlayer: Record<string, number> = {};
  matches.forEach(m => {
    (m.goals || []).forEach(g => {
      goalsPerPlayer[g.playerId] = (goalsPerPlayer[g.playerId] || 0) + 1;
    });
  });
  const topScorerEntry = Object.entries(goalsPerPlayer).sort((a, b) => b[1] - a[1])[0];
  const topScorerPlayer = topScorerEntry ? players.find(p => p.id === topScorerEntry[0]) : undefined;

  const absenceThreshold = settings.absenceThresholdForDismissal ?? 6;
  const atRiskPlayers = getPlayersAtRiskOfDismissal(players, matches, absenceThreshold);

  return (
    <div className="space-y-6">

      {/* Disciplinary Alert Banner for Players Absent 6 Consecutive Matches */}
      {atRiskPlayers.length > 0 && (
        <div className="bg-gradient-to-r from-rose-950/90 via-slate-900 to-slate-900 border-2 border-rose-600/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl shadow-rose-950/20 animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-bold text-white">
                  វិន័យក្រុម៖ មានកីឡាករ {atRiskPlayers.length} នាក់ អវត្តមាន {absenceThreshold} ប្រកួតជាប់ៗគ្នា
                </span>
                <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[11px] font-bold border border-rose-500/30">
                  ត្រូវដកចេញពីក្រុម
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {atRiskPlayers.map(a => `#${a.player.number} ${a.player.name} (ខកខាន ${a.summary.consecutiveMissed} ប្រកួតជាប់ៗគ្នា)`).join(' • ')}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('players')}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-950/40 transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <UserX className="w-3.5 h-3.5" />
            <span>ពិនិត្យ & ដកចេញ</span>
          </button>
        </div>
      )}
      
      {/* Next Match Highlight Banner (Hero) */}
      {nextMatch ? (
        <div className="bg-gradient-to-br from-blue-950/80 via-slate-900 to-indigo-950/70 border border-blue-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
                ការប្រកួតបន្ទាប់ (Next Upcoming Match)
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1">
                🧤 អ្នកចាំទី (GK) Free
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-900/50 border border-blue-700/50 text-xs text-blue-200 font-mono font-semibold">
                ទម្រង់ {nextMatch.format}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            
            {/* Teams VS Banner */}
            <div className="md:col-span-7 flex items-center justify-between sm:justify-start gap-4 sm:gap-6">
              <div className="text-right">
                <h3 className="text-xl sm:text-2xl font-black text-white">{settings.clubName}</h3>
                <span className="text-xs text-blue-400 font-medium">ម្ចាស់ផ្ទះ</span>
              </div>

              <div className="px-3.5 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 text-center font-bold text-xs text-slate-400 font-mono shadow-inner">
                VS
              </div>

              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{nextMatch.opponentLogo || '⚽'}</span>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-200">{nextMatch.opponentName}</h3>
                </div>
                <span className="text-xs text-rose-400 font-medium">គូប្រកួត</span>
              </div>
            </div>

            {/* Time & Stadium Details & RSVP Status */}
            <div className="md:col-span-5 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3 text-xs">
              <div className="flex items-center gap-2 text-slate-200">
                <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="font-semibold">{formatDateKh(nextMatch.date)}</span>
                <span className="text-slate-500">•</span>
                <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="font-semibold">{nextMatch.time}</span>
              </div>

              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="truncate">{nextMatch.stadium} {nextMatch.pitchNumber ? `(${nextMatch.pitchNumber})` : ''}</span>
              </div>

              {/* RSVP Voting Status Bar */}
              {nextMatchAnalysis && (
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3 text-amber-400" />
                      ស្ថានភាពបោះឆ្នោត (RSVP)
                    </span>
                    <span className="font-bold text-white">
                      {nextMatchAnalysis.votedYesCount} នាក់ទៅលេង
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold">
                      ✅ {nextMatchAnalysis.votedYesCount} ទៅ
                    </span>
                    <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 font-bold">
                      ❌ {nextMatchAnalysis.votedNoCount} មិនទៅ
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold">
                      ❓ {nextMatchAnalysis.notVotedCount} មិនទាន់ Vote
                    </span>
                    {nextMatchAnalysis.flakedCount > 0 && (
                      <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-bold animate-pulse">
                        🚨 {nextMatchAnalysis.flakedCount} នាក់ Vote ទៅតែអត់ទៅ
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-slate-400 gap-2 flex-wrap">
                <div>
                  <span>ថ្លៃបង់៖ <strong className="text-white font-mono">{formatCurrency(nextMatch.feePerPlayer, settings.currency)}</strong></span>
                  <span className="text-[10px] text-amber-300 block font-medium">(GK មិនគិតថ្លៃ)</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShareMatch(nextMatch)}
                    className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                    title="ចែករំលែក Match Day ទៅកាន់បណ្តាញសង្គម ឬឧបករណ៍ផ្សេងទៀត"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>ចែករំលែក</span>
                  </button>

                  <button
                    onClick={() => onSelectMatch(nextMatch)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    <span>បោះឆ្នោត & ពិនិត្យ</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      ) : (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 text-center space-y-3">
          <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">មិនទាន់មានការប្រកួតគ្រោងទុកខាងមុខទេ</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            រៀបចំកាលវិភាគប្រកួតថ្មី ដើម្បីកោះហៅកីឡាករ និងកំណត់ថ្លៃតារាង។
          </p>
          <button
            onClick={onOpenNewMatch}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>បង្កើតកាលវិភាគប្រកួតឥឡូវនេះ</span>
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Treasury Card */}
        <div 
          onClick={() => onNavigateTab('finances')}
          className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all cursor-pointer shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">មូលនិធិក្រុមសល់</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${netBalance >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <h4 className={`text-xl font-black mt-2 ${netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {netBalance >= 0 ? '+' : ''}{formatCurrency(netBalance, settings.currency)}
          </h4>
          <span className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 group-hover:text-blue-400 transition-colors">
            <span>ពិនិត្យរបាយការណ៍ហិរញ្ញវត្ថុ</span>
            <ChevronRight className="w-3 h-3" />
          </span>
        </div>

        {/* Players Card */}
        <div 
          onClick={() => onNavigateTab('players')}
          className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all cursor-pointer shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">កីឡាករក្នុងក្រុម</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <h4 className="text-xl font-black text-white mt-2">
            {players.length} នាក់
          </h4>
          <span className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 group-hover:text-blue-400 transition-colors">
            <span>{players.filter(p => p.status === 'active').length} នាក់សកម្ម • គ្រប់គ្រងបញ្ជី</span>
            <ChevronRight className="w-3 h-3" />
          </span>
        </div>

        {/* Unpaid Debt Card */}
        <div 
          onClick={() => onNavigateTab('finances')}
          className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all cursor-pointer shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">ជំពាក់មិនទាន់បង់</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <h4 className="text-xl font-black text-amber-400 mt-2">
            {formatCurrency(totalPendingDebt, settings.currency)}
          </h4>
          <span className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 group-hover:text-amber-400 transition-colors">
            <span>តាមដានការទូទាត់ថ្លៃតារាង</span>
            <ChevronRight className="w-3 h-3" />
          </span>
        </div>

        {/* Top Scorer Card */}
        <div 
          onClick={() => onNavigateTab('stats')}
          className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all cursor-pointer shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">អ្នកស៊ុតច្រើនជាងគេ</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <h4 className="text-base font-black text-white mt-2 truncate">
            {topScorerPlayer ? `#${topScorerPlayer.number} ${topScorerPlayer.name}` : 'មិនទាន់មាន'}
          </h4>
          <span className="text-[11px] text-amber-400 mt-1 flex items-center gap-1 group-hover:text-amber-300 transition-colors">
            <span>{topScorerEntry ? `${topScorerEntry[1]} គ្រាប់` : '0 គ្រាប់'} • មើលស្ថិតិលម្អិត</span>
            <ChevronRight className="w-3 h-3" />
          </span>
        </div>

      </div>

      {/* Google Sheets Sync Banner / Quick Connect */}
      {(() => {
        const sheetConfig = getSavedSyncConfig();
        return (
          <div className="bg-gradient-to-r from-emerald-950/50 via-slate-900 to-slate-900 border border-emerald-600/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md shadow-emerald-950/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-white">
                    {sheetConfig ? sheetConfig.spreadsheetTitle : 'ភ្ជាប់ទិន្នន័យទៅកាន់ Google Sheets'}
                  </h4>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                    {sheetConfig ? 'បានភ្ជាប់ (Connected)' : 'Google Workspace'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {sheetConfig?.lastSyncedAt
                    ? `សមកាលកម្មចុងក្រោយ៖ ${new Date(sheetConfig.lastSyncedAt).toLocaleString('km-KH')} (កីឡាករ, ប្រកួត, វត្តមាន, ហិរញ្ញវត្ថុ)`
                    : 'ធ្វើសមកាលកម្មទិន្នន័យកីឡាករ កាលវិភាគប្រកួត វត្តមាន និងហិរញ្ញវត្ថុលើ Google Spreadsheet របស់អ្នក'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {sheetConfig?.spreadsheetUrl && (
                <a
                  href={sheetConfig.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>បើក Sheet</span>
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                </a>
              )}
              <button
                onClick={onOpenGoogleSheets}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/40 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>{sheetConfig ? 'គ្រប់គ្រង & Sync' : 'ភ្ជាប់ឥឡូវនេះ'}</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Two Column Layout: Recent Matches & Quick Squad Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Recent Matches */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              លទ្ធផលប្រកួតថ្មីៗ (Recent Results)
            </h4>
            <button
              onClick={() => onNavigateTab('matches')}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <span>មើលទាំងអស់ ({matches.length})</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {recentFinished.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">មិនទាន់មានការប្រកួតដែលបានបញ្ចប់នៅឡើយទេ</p>
          ) : (
            <div className="space-y-2.5">
              {recentFinished.map(m => {
                const fin = calculateMatchFinance(m);
                const isWin = m.homeScore > m.awayScore;
                const isDraw = m.homeScore === m.awayScore;

                return (
                  <div
                    key={m.id}
                    onClick={() => onSelectMatch(m)}
                    className="p-3.5 bg-slate-950/70 hover:bg-slate-800/40 border border-slate-800/80 rounded-xl flex items-center justify-between gap-3 transition-colors cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                          isWin ? 'bg-emerald-500/20 text-emerald-400' : isDraw ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {isWin ? 'ឈ្នះ' : isDraw ? 'ស្មើ' : 'ចាញ់'}
                        </span>
                        <span className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                          vs {m.opponentName}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {formatDateKh(m.date)} • {m.stadium}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-lg font-black text-white font-mono block">
                          {m.homeScore} - {m.awayScore}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {fin.paidCount}/{fin.squadCount} នាក់បង់
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Squad Status */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              កីឡាករក្នុងក្រុម ({players.length})
            </h4>
            <button
              onClick={() => onNavigateTab('players')}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <span>គ្រប់គ្រង</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {players.slice(0, 6).map(p => (
              <div key={p.id} className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img src={p.photo} alt={p.name} className="w-8 h-8 rounded-lg object-cover border border-slate-700 bg-slate-800" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-[10px] text-blue-400 font-bold">{p.code}</span>
                      <span className="text-xs font-bold text-white truncate">#{p.number} {p.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{p.position} • {p.phone || 'គ្មានលេខ'}</span>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                  p.status === 'active' ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                }`}>
                  {p.status === 'active' ? 'សកម្ម' : 'របួស'}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={onOpenNewPlayer}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>ចុះឈ្មោះកីឡាករថ្មី</span>
          </button>
        </div>

      </div>

      {/* Social Media & Multi-device Share Modal for Upcoming Match */}
      {shareMatch && (
        <MatchShareModal
          isOpen={!!shareMatch}
          onClose={() => setShareMatch(null)}
          match={shareMatch}
          players={players}
          settings={settings}
        />
      )}

    </div>
  );
};
