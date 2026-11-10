import React, { useState, useRef } from 'react';
import { Match, Player, MatchGoal, MatchCard, MatchExpense, ExpenseCategory, PlayerVoteStatus, PlayerFeeStatus, ClubSettings } from '../types';
import { 
  formatCurrency, 
  formatDateKh, 
  calculateMatchFinance, 
  generateTelegramShareText,
  getMatchVoteAnalysis,
  generateTelegramVotePollText,
  compressAndResizeImage
} from '../utils/formatters';
import confetti from 'canvas-confetti';
import { MatchShareModal } from './MatchShareModal';
import { MatchPosterModal } from './MatchPosterModal';
import { 
  X, 
  Trophy, 
  DollarSign, 
  Calendar, 
  Clock, 
  MapPin, 
  Plus, 
  Trash2, 
  Check, 
  Share2, 
  Star, 
  Users, 
  AlertCircle, 
  CheckCircle2, 
  Copy,
  Receipt,
  Flag,
  Activity,
  ShieldAlert,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Filter,
  Sparkles,
  CheckCheck,
  Edit3,
  Camera,
  Image as ImageIcon
} from 'lucide-react';

interface MatchDetailModalProps {
  match: Match;
  players: Player[];
  clubName: string;
  currency: 'KHR' | 'USD';
  settings?: ClubSettings;
  onUpdateMatch: (updatedMatch: Match) => void;
  onClose: () => void;
}

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({
  match,
  players,
  clubName,
  currency,
  settings,
  onUpdateMatch,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'finance' | 'lineup' | 'vote'>(
    match.status === 'scheduled' ? 'vote' : 'stats'
  );
  const [copiedTelegram, setCopiedTelegram] = useState(false);
  const [copiedVotePoll, setCopiedVotePoll] = useState(false);
  const [showTelegramPreview, setShowTelegramPreview] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [voteFilter, setVoteFilter] = useState<'all' | 'flaked' | 'yes' | 'no' | 'unvoted'>('all');
  const [showPosterModal, setShowPosterModal] = useState(false);

  // Opponent editing state
  const [isEditingOpponent, setIsEditingOpponent] = useState(false);
  const [editOpponentName, setEditOpponentName] = useState(match.opponentName);
  const [editOpponentLogo, setEditOpponentLogo] = useState(match.opponentLogo || '⚽');
  const editOpponentLogoRef = useRef<HTMLInputElement>(null);

  const handleEditOpponentLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressAndResizeImage(file, 240);
        if (compressed) {
          setEditOpponentLogo(compressed);
        }
      } catch {
        console.error('Error uploading opponent logo image');
      }
    }
    if (e.target) e.target.value = '';
  };

  const handleSaveOpponentEdit = () => {
    onUpdateMatch({
      ...match,
      opponentName: editOpponentName.trim() || match.opponentName,
      opponentLogo: editOpponentLogo,
    });
    setIsEditingOpponent(false);
  };

  // Stats sub-states
  const [newScorerId, setNewScorerId] = useState<string>(players[0]?.id || '');
  const [newAssistId, setNewAssistId] = useState<string>('');
  const [newGoalMinute, setNewGoalMinute] = useState<number>(15);
  const [newGoalType, setNewGoalType] = useState<MatchGoal['type']>('regular');

  // Card sub-states
  const [newCardPlayerId, setNewCardPlayerId] = useState<string>(players[0]?.id || '');
  const [newCardType, setNewCardType] = useState<'yellow' | 'red'>('yellow');
  const [newCardMinute, setNewCardMinute] = useState<number>(30);
  const [newCardReason, setNewCardReason] = useState<string>('');

  // Expense sub-states
  const [newExpCategory, setNewExpCategory] = useState<ExpenseCategory>('pitch');
  const [newExpTitle, setNewExpTitle] = useState<string>('ថ្លៃជួលតារាងបាល់');
  const [newExpAmount, setNewExpAmount] = useState<number>(currency === 'KHR' ? 80000 : 20);

  const playerMap = new Map(players.map(p => [p.id, p]));
  const fin = calculateMatchFinance(match, playerMap);
  const analysis = getMatchVoteAnalysis(match, players);

  // Trigger win confetti
  const handleScoreChange = (home: number, away: number) => {
    const updated = {
      ...match,
      homeScore: Math.max(0, home),
      awayScore: Math.max(0, away),
      status: match.status === 'scheduled' ? ('finished' as const) : match.status,
    };
    if (home > away && match.homeScore <= match.awayScore) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
    onUpdateMatch(updated);
  };

  // Set / Update player pre-match RSVP vote
  const handleSetVote = (playerId: string, status: PlayerVoteStatus | null, reason?: string) => {
    const updatedVotes = { ...(match.votes || {}) };
    if (status === null) {
      delete updatedVotes[playerId];
    } else {
      updatedVotes[playerId] = {
        status,
        votedAt: new Date().toISOString().split('T')[0],
        reason: reason !== undefined ? reason : updatedVotes[playerId]?.reason,
      };
    }
    onUpdateMatch({
      ...match,
      votes: updatedVotes,
    });
  };

  // Auto-fill squad from players who voted 'yes'
  const handleAutoFillSquadFromVotes = () => {
    const yesIds = analysis.votedYesPlayers.map(p => p.id);
    const newSquad = Array.from(new Set([...(match.squadPlayerIds || []), ...yesIds]));
    const updatedFees = { ...(match.playerFees || {}) };

    newSquad.forEach(id => {
      const p = playerMap.get(id);
      const isGK = p?.position === 'GK';
      if (!updatedFees[id]) {
        updatedFees[id] = {
          hasPaid: false,
          amount: isGK ? 0 : match.feePerPlayer,
          isExempt: isGK,
        };
      }
    });

    onUpdateMatch({
      ...match,
      squadPlayerIds: newSquad,
      playerFees: updatedFees,
    });
  };

  // Copy Telegram Pre-Match Poll / RSVP Text
  const handleCopyVotePoll = () => {
    const text = generateTelegramVotePollText(match, players, clubName);
    navigator.clipboard.writeText(text);
    setCopiedVotePoll(true);
    setTimeout(() => setCopiedVotePoll(false), 2500);
  };

  // Toggle player payment status (GK is exempt from mandatory payment)
  // Toggle or set player fee payment state (paid, unpaid, or exempt with custom reasons)
  const handleSetPlayerFeeState = (playerId: string, state: 'paid' | 'unpaid' | 'exempt', customNote?: string) => {
    const current = match.playerFees?.[playerId];
    const playerObj = playerMap.get(playerId);
    const isGK = playerObj?.position === 'GK';

    let updatedInfo: PlayerFeeStatus;

    if (state === 'paid') {
      updatedInfo = {
        hasPaid: true,
        amount: current?.amount && current.amount > 0 ? current.amount : (isGK ? 0 : match.feePerPlayer),
        paidAt: new Date().toISOString().split('T')[0],
        note: customNote !== undefined ? customNote : (current?.note || (isGK ? 'បង់ស្ម័គ្រចិត្ត' : 'បានបង់')),
        isExempt: isGK || current?.isExempt || false,
      };
    } else if (state === 'exempt') {
      updatedInfo = {
        hasPaid: false,
        amount: 0,
        note: customNote !== undefined ? customNote : (current?.note || 'លើកលែងមិនបង់ប្រាក់ (លើកទឹកចិត្ត/ស្នើសុំ)'),
        isExempt: true,
      };
    } else {
      // unpaid
      updatedInfo = {
        hasPaid: false,
        amount: match.feePerPlayer,
        paidAt: undefined,
        note: customNote !== undefined ? customNote : '',
        isExempt: false,
      };
    }

    const updatedFees = {
      ...(match.playerFees || {}),
      [playerId]: updatedInfo,
    };

    onUpdateMatch({
      ...match,
      playerFees: updatedFees,
    });
  };

  // Legacy toggle helper
  const handleTogglePlayerPayment = (playerId: string) => {
    const current = match.playerFees?.[playerId];
    const playerObj = playerMap.get(playerId);
    const isGK = playerObj?.position === 'GK';

    if (current?.isExempt && !isGK) {
      // If currently exempt, toggle to paid
      handleSetPlayerFeeState(playerId, 'paid');
    } else if (current?.hasPaid) {
      // If paid, toggle to unpaid
      handleSetPlayerFeeState(playerId, 'unpaid');
    } else {
      // If unpaid, toggle to paid
      handleSetPlayerFeeState(playerId, 'paid');
    }
  };

  // Update specific player amount or note
  const handleUpdatePlayerFeeDetails = (playerId: string, amount: number, note: string) => {
    const playerObj = playerMap.get(playerId);
    const isGK = playerObj?.position === 'GK';
    const current = match.playerFees?.[playerId] || { 
      hasPaid: false, 
      amount: isGK ? 0 : match.feePerPlayer, 
      isExempt: isGK 
    };

    const updatedFees = {
      ...(match.playerFees || {}),
      [playerId]: {
        ...current,
        amount,
        note,
        isExempt: current.isExempt || isGK,
      }
    };
    onUpdateMatch({
      ...match,
      playerFees: updatedFees,
    });
  };

  // Mark all squad members as paid (respects GK exemption)
  const handleMarkAllPaid = () => {
    const updatedFees = { ...(match.playerFees || {}) };
    (match.squadPlayerIds || []).forEach(pId => {
      const p = playerMap.get(pId);
      const isGK = p?.position === 'GK';
      updatedFees[pId] = {
        hasPaid: true,
        amount: isGK ? (updatedFees[pId]?.amount || 0) : match.feePerPlayer,
        paidAt: new Date().toISOString().split('T')[0],
        isExempt: isGK,
      };
    });
    onUpdateMatch({
      ...match,
      playerFees: updatedFees,
    });
  };

  // Add Goal
  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScorerId) return;

    const scorer = playerMap.get(newScorerId);
    const assist = newAssistId ? playerMap.get(newAssistId) : undefined;

    const newGoal: MatchGoal = {
      id: `g-${Date.now()}`,
      playerId: newScorerId,
      scorerName: scorer?.name,
      assistPlayerId: newAssistId || undefined,
      assistName: assist?.name,
      minute: Number(newGoalMinute),
      type: newGoalType,
    };

    const newHomeScore = match.homeScore + (newGoalType === 'own_goal' ? 0 : 1);
    const newAwayScore = match.awayScore + (newGoalType === 'own_goal' ? 1 : 0);

    onUpdateMatch({
      ...match,
      goals: [...(match.goals || []), newGoal],
      homeScore: newHomeScore,
      awayScore: newAwayScore,
      status: match.status === 'scheduled' ? 'finished' : match.status,
    });
  };

  // Remove Goal
  const handleRemoveGoal = (goalId: string) => {
    const goalToRemove = match.goals.find(g => g.id === goalId);
    if (!goalToRemove) return;

    let newHomeScore = match.homeScore;
    let newAwayScore = match.awayScore;
    if (goalToRemove.type === 'own_goal') {
      newAwayScore = Math.max(0, newAwayScore - 1);
    } else {
      newHomeScore = Math.max(0, newHomeScore - 1);
    }

    onUpdateMatch({
      ...match,
      goals: match.goals.filter(g => g.id !== goalId),
      homeScore: newHomeScore,
      awayScore: newAwayScore,
    });
  };

  // Add Card
  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardPlayerId) return;

    const p = playerMap.get(newCardPlayerId);
    const newCard: MatchCard = {
      id: `c-${Date.now()}`,
      playerId: newCardPlayerId,
      playerName: p?.name,
      type: newCardType,
      minute: Number(newCardMinute),
      reason: newCardReason.trim() || undefined,
    };

    onUpdateMatch({
      ...match,
      cards: [...(match.cards || []), newCard],
    });

    setNewCardReason('');
  };

  // Remove Card
  const handleRemoveCard = (cardId: string) => {
    onUpdateMatch({
      ...match,
      cards: match.cards.filter(c => c.id !== cardId),
    });
  };

  // Add Expense
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpTitle.trim() || newExpAmount <= 0) return;

    const newExp: MatchExpense = {
      id: `exp-${Date.now()}`,
      category: newExpCategory,
      title: newExpTitle.trim(),
      amount: Number(newExpAmount),
    };

    onUpdateMatch({
      ...match,
      expenses: [...(match.expenses || []), newExp],
    });

    setNewExpTitle('ថ្លៃទឹកសុទ្ធ & ភេសជ្ជៈ');
    setNewExpAmount(currency === 'KHR' ? 10000 : 2.5);
  };

  // Remove Expense
  const handleRemoveExpense = (expId: string) => {
    onUpdateMatch({
      ...match,
      expenses: match.expenses.filter(e => e.id !== expId),
    });
  };

  // Toggle Squad Member
  const handleToggleSquadMember = (playerId: string) => {
    const isCurrentlyIn = match.squadPlayerIds.includes(playerId);
    let newSquad: string[];
    const updatedFees = { ...(match.playerFees || {}) };

    if (isCurrentlyIn) {
      newSquad = match.squadPlayerIds.filter(id => id !== playerId);
      delete updatedFees[playerId];
    } else {
      newSquad = [...match.squadPlayerIds, playerId];
      const playerObj = playerMap.get(playerId);
      const isGK = playerObj?.position === 'GK';
      updatedFees[playerId] = {
        hasPaid: false,
        amount: isGK ? 0 : match.feePerPlayer,
        isExempt: isGK,
      };
    }

    onUpdateMatch({
      ...match,
      squadPlayerIds: newSquad,
      playerFees: updatedFees,
    });
  };

  // Copy Telegram Message
  const handleCopyTelegram = () => {
    const text = generateTelegramShareText(match, players, clubName, currency);
    navigator.clipboard.writeText(text);
    setCopiedTelegram(true);
    setTimeout(() => setCopiedTelegram(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl my-6 overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Modal Top Match Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 p-4 sm:p-6 shrink-0 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Match Location & Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 mb-3 pr-8">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-800 font-semibold font-mono">
                ការប្រកួតទី #{match.matchNumber} ({match.format})
              </span>
              <span className="flex items-center gap-1 text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                {formatDateKh(match.date)}
              </span>
              <span className="flex items-center gap-1 text-slate-300">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                {match.time}
              </span>
              <span className="flex items-center gap-1 text-slate-300 truncate max-w-xs">
                <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                {match.stadium} {match.pitchNumber ? `(${match.pitchNumber})` : ''}
              </span>
            </div>

            {/* Status Selector */}
            <select
              value={match.status}
              onChange={e => onUpdateMatch({ ...match, status: e.target.value as Match['status'] })}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="scheduled">កាលវិភាគគ្រោងទុក (Scheduled)</option>
              <option value="live">កំពុងប្រកួត (Live)</option>
              <option value="finished">បានប្រកួតរួច (Finished)</option>
              <option value="cancelled">បានលុបចោល (Cancelled)</option>
            </select>
          </div>

          {/* Big Scoreboard Banner */}
          <div className="flex items-center justify-between gap-4 py-2">
            {/* Home Team */}
            <div className="flex-1 text-right">
              <h3 className="text-lg sm:text-2xl font-black text-white truncate">{clubName}</h3>
              <span className="text-xs text-blue-400 font-semibold">(ក្រុមម្ចាស់ផ្ទះ)</span>
            </div>

            {/* Live Interactive Score Counter */}
            <div className="flex items-center gap-2 sm:gap-4 bg-slate-950/80 px-4 py-2 rounded-2xl border border-slate-800 shadow-inner">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleScoreChange(match.homeScore - 1, match.awayScore)}
                    className="w-6 h-6 rounded-md bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-xs"
                  >
                    -
                  </button>
                  <span className="text-2xl sm:text-4xl font-black text-white min-w-8 text-center font-mono">
                    {match.homeScore}
                  </span>
                  <button
                    onClick={() => handleScoreChange(match.homeScore + 1, match.awayScore)}
                    className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs"
                  >
                    +
                  </button>
                </div>
              </div>

              <span className="text-xl sm:text-2xl font-black text-slate-500">:</span>

              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleScoreChange(match.homeScore, match.awayScore - 1)}
                    className="w-6 h-6 rounded-md bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-xs"
                  >
                    -
                  </button>
                  <span className="text-2xl sm:text-4xl font-black text-white min-w-8 text-center font-mono">
                    {match.awayScore}
                  </span>
                  <button
                    onClick={() => handleScoreChange(match.homeScore, match.awayScore + 1)}
                    className="w-6 h-6 rounded-md bg-rose-600 text-white flex items-center justify-center font-bold text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Away Team */}
            <div className="flex-1 text-left relative">
              {isEditingOpponent ? (
                <div className="bg-slate-950 border border-slate-700 p-2.5 rounded-xl space-y-2 text-xs shadow-lg max-w-xs z-10">
                  <div className="font-semibold text-rose-300">កែប្រែព័ត៌មានគូប្រកួត</div>
                  <input
                    type="text"
                    value={editOpponentName}
                    onChange={e => setEditOpponentName(e.target.value)}
                    placeholder="ឈ្មោះក្រុមគូប្រកួត"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs"
                  />
                  <div className="flex items-center gap-1.5">
                    <div className="w-7 h-7 rounded bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden text-sm">
                      {editOpponentLogo && (editOpponentLogo.startsWith('http') || editOpponentLogo.startsWith('data:') || editOpponentLogo.includes('/') || editOpponentLogo.includes('.')) ? (
                        <img src={editOpponentLogo} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <span>{editOpponentLogo}</span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={editOpponentLogo}
                      onChange={e => setEditOpponentLogo(e.target.value)}
                      placeholder="Emoji/URL Logo"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => editOpponentLogoRef.current?.click()}
                      className="p-1 bg-rose-600 text-white rounded hover:bg-rose-500 shrink-0 cursor-pointer"
                      title="ឡើងរូប Logo"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="file"
                      ref={editOpponentLogoRef}
                      accept="image/*"
                      onChange={handleEditOpponentLogoUpload}
                      className="hidden"
                    />
                  </div>
                  {/* Preset Emojis */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {['⚽', '🐉', '🦅', '🐅', '🦁', '⚡', '🤝', '🔥', '🛡️', '🏆'].map(icon => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setEditOpponentLogo(icon)}
                        className={`w-5 h-5 rounded text-[11px] flex items-center justify-center border cursor-pointer ${editOpponentLogo === icon ? 'border-rose-400 bg-rose-950 text-white' : 'border-slate-800 bg-slate-900 text-slate-300'}`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingOpponent(false)}
                      className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-[11px] cursor-pointer"
                    >
                      បោះបង់
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveOpponentEdit}
                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] cursor-pointer"
                    >
                      រក្សាទុក
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden text-lg shadow-sm">
                      {match.opponentLogo && (match.opponentLogo.startsWith('http') || match.opponentLogo.startsWith('data:') || match.opponentLogo.includes('/') || match.opponentLogo.includes('.')) ? (
                        <img src={match.opponentLogo} alt={match.opponentName} className="w-full h-full object-cover" />
                      ) : (
                        <span>{match.opponentLogo || '⚽'}</span>
                      )}
                    </div>
                    <h3 className="text-lg sm:text-2xl font-black text-slate-200 truncate">{match.opponentName}</h3>
                    <button
                      onClick={() => {
                        setEditOpponentName(match.opponentName);
                        setEditOpponentLogo(match.opponentLogo || '⚽');
                        setIsEditingOpponent(true);
                      }}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors rounded-lg hover:bg-slate-800 cursor-pointer"
                      title="កែប្រែឈ្មោះ & Logo គូប្រកួត"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-xs text-rose-400 font-semibold">(ក្រុមគូប្រកួត)</span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center justify-between border-t border-slate-800/80 mt-4 pt-3 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 flex-wrap">
              <button
                onClick={() => setActiveTab('vote')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'vote' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>បោះឆ្នោត & RSVP ({analysis.votedYesCount} ទៅ)</span>
                {analysis.flakedCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse" title="មានអ្នក Vote ទៅ តែអត់ទៅ">
                    {analysis.flakedCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('stats')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${activeTab === 'stats' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>ស្ថិតិប្រកួត ({match.goals.length} គ្រាប់)</span>
              </button>

              <button
                onClick={() => setActiveTab('finance')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${activeTab === 'finance' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>ចំណូល & ថ្លៃតារាង ({fin.paidCount}/{fin.squadCount})</span>
              </button>

              <button
                onClick={() => setActiveTab('lineup')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${activeTab === 'lineup' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>វត្តមានកីឡាករ ({match.squadPlayerIds.length})</span>
              </button>
            </div>

            {/* Share, Poster and Telegram Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setShowPosterModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm"
                title="បង្កើតរូបភាព Poster សម្រាប់ផុស Facebook"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>🎨 Poster</span>
              </button>

              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm"
                title="ចែករំលែកទៅកាន់បណ្តាញសង្គម / Other Device"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>ចែករំលែក</span>
              </button>

              <button
                onClick={handleCopyTelegram}
                className="flex items-center gap-1 px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                title="ចម្លងរបាយការណ៍សម្រាប់ Telegram"
              >
                {copiedTelegram ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copiedTelegram ? 'បានចម្លង!' : 'របាយការណ៍'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 0: PRE-MATCH VOTING / RSVP & ATTENDANCE DISCIPLINE */}
          {activeTab === 'vote' && (
            <div className="space-y-6">

              {/* Vote KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">កីឡាករទាំងអស់</span>
                  <span className="text-base font-bold text-white mt-0.5 block">
                    {analysis.votedYesCount + analysis.votedNoCount + analysis.notVotedCount} នាក់
                  </span>
                  <span className="text-[10px] text-slate-500">កីឡាករសកម្ម</span>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-emerald-500/30">
                  <span className="text-[10px] text-emerald-400 block font-medium">✅ Vote ទៅលេង</span>
                  <span className="text-base font-bold text-emerald-300 mt-0.5 block">
                    {analysis.votedYesCount} នាក់
                  </span>
                  <span className="text-[10px] text-emerald-500">បានចុះឈ្មោះ</span>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-rose-500/30">
                  <span className="text-[10px] text-rose-400 block font-medium">❌ Vote មិនទៅ</span>
                  <span className="text-base font-bold text-rose-300 mt-0.5 block">
                    {analysis.votedNoCount} នាក់
                  </span>
                  <span className="text-[10px] text-rose-500">បានសុំច្បាប់</span>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-amber-400 block font-medium">❓ មិនទាន់ Vote</span>
                  <span className="text-base font-bold text-amber-300 mt-0.5 block">
                    {analysis.notVotedCount} នាក់
                  </span>
                  <span className="text-[10px] text-amber-500">រង់ចាំចម្លើយ</span>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-blue-500/30">
                  <span className="text-[10px] text-blue-400 block font-medium">🌟 វត្តមានជាក់ស្តែង</span>
                  <span className="text-base font-bold text-blue-300 mt-0.5 block">
                    {match.squadPlayerIds.length} នាក់
                  </span>
                  <span className="text-[10px] text-blue-500">ក្នុងបញ្ជីប្រកួត</span>
                </div>

                <div className={`p-3 rounded-xl border ${
                  analysis.flakedCount > 0 
                    ? 'bg-rose-950/40 border-rose-500/60 animate-pulse' 
                    : 'bg-slate-950/80 border-slate-800'
                }`}>
                  <span className="text-[10px] text-rose-400 block font-bold">🚨 Vote ទៅ តែអត់ទៅ</span>
                  <span className="text-base font-black text-rose-300 mt-0.5 block">
                    {analysis.flakedCount} នាក់
                  </span>
                  <span className="text-[10px] text-rose-400 font-semibold">
                    {analysis.flakedCount > 0 ? 'ខកខាន / No-Show' : 'គ្មានបញ្ហា'}
                  </span>
                </div>
              </div>

              {/* No-Show / Flaked Warning Alert Banner */}
              {analysis.flakedCount > 0 && (
                <div className="bg-gradient-to-r from-rose-950/90 via-slate-900 to-slate-900 border-2 border-rose-600/70 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5 animate-bounce" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white">
                          ក្រុមកីឡាករដាក់ Vote ទៅលេង តែដល់ម៉ោងមិនទៅ ({analysis.flakedCount} នាក់)
                        </h4>
                        <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold">
                          គ្មានវត្តមាន / No-Show
                        </span>
                      </div>
                      <p className="text-xs text-rose-200 mt-1">
                        {analysis.flakedPlayers.map(p => `#${p.number} ${p.name} (${p.code})`).join(' • ')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Toolbar & GK Notice */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleAutoFillSquadFromVotes}
                      disabled={analysis.votedYesCount === 0}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-md"
                      title="បញ្ចូលអ្នកដែលបាន Vote ទៅលេង ទាំងអស់ចូលទៅក្នុងបញ្ជីវត្តមានប្រកួតដោយស្វ័យប្រវត្តិ"
                    >
                      <CheckCheck className="w-4 h-4" />
                      <span>បញ្ចូលអ្នក Vote ទៅលេង ({analysis.votedYesCount}) ចូលក្នុងបញ្ជីវត្តមាន</span>
                    </button>

                    <button
                      onClick={handleCopyVotePoll}
                      className="flex items-center gap-1.5 px-3 py-2 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      {copiedVotePoll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedVotePoll ? 'បានចម្លងរួចរាល់!' : 'ចម្លងបញ្ជី Vote ដាក់ Telegram'}</span>
                    </button>

                    <button
                      onClick={() => setShowShareModal(true)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>ផ្ទាំងរូបភាព & ចែករំលែក Match Day</span>
                    </button>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto text-[11px] font-bold">
                    <button
                      onClick={() => setVoteFilter('all')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                        voteFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      ទាំងអស់ ({players.filter(p => p.status === 'active').length})
                    </button>
                    <button
                      onClick={() => setVoteFilter('flaked')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                        voteFilter === 'flaked' ? 'bg-rose-600 text-white' : 'text-rose-400 hover:text-rose-300'
                      }`}
                    >
                      <span>🚨 Vote ទៅ តែមិនទៅ ({analysis.flakedCount})</span>
                    </button>
                    <button
                      onClick={() => setVoteFilter('yes')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                        voteFilter === 'yes' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      ✅ Vote ទៅ ({analysis.votedYesCount})
                    </button>
                    <button
                      onClick={() => setVoteFilter('no')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                        voteFilter === 'no' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      ❌ Vote មិនទៅ ({analysis.votedNoCount})
                    </button>
                    <button
                      onClick={() => setVoteFilter('unvoted')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                        voteFilter === 'unvoted' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      ❓ មិនទាន់ Vote ({analysis.notVotedCount})
                    </button>
                  </div>
                </div>

                {/* GK Notice banner */}
                <div className="flex items-center gap-2 text-xs text-amber-300/90 bg-amber-950/20 border border-amber-500/20 px-3 py-2 rounded-xl">
                  <span className="text-base">🧤</span>
                  <span><strong>គោលការណ៍អ្នកចាំទី (GK)៖</strong> អ្នកចាំទីមិនតម្រូវឱ្យបង់ប្រាក់ថ្លៃតារាងឡើយ (Free) ប៉ុន្តែកីឡាករអាចបង់ស្ម័គ្រចិត្តបាន (អោយក៏បាន អត់ក៏បាន)។</span>
                </div>
              </div>

              {/* Player RSVP Voting List */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4 text-amber-400" />
                    តារាងបោះឆ្នោតចូលរួម & ពិនិត្យវត្តមានជាក់ស្តែង
                  </h4>
                  <span className="text-xs text-slate-400">គ្រប់គ្រងសកម្មភាពកីឡាករម្នាក់ៗ</span>
                </div>

                <div className="divide-y divide-slate-800/60 max-h-[460px] overflow-y-auto">
                  {players
                    .filter(p => {
                      if (p.status !== 'active') return false;
                      const vote = match.votes?.[p.id];
                      const inSquad = match.squadPlayerIds.includes(p.id);

                      if (voteFilter === 'flaked') return vote?.status === 'yes' && !inSquad;
                      if (voteFilter === 'yes') return vote?.status === 'yes';
                      if (voteFilter === 'no') return vote?.status === 'no';
                      if (voteFilter === 'unvoted') return !vote;
                      return true;
                    })
                    .map(p => {
                      const vote = match.votes?.[p.id];
                      const inSquad = match.squadPlayerIds.includes(p.id);
                      const isGK = p.position === 'GK';
                      const isFlaked = vote?.status === 'yes' && !inSquad;
                      const isAttendedAsVoted = vote?.status === 'yes' && inSquad;

                      return (
                        <div 
                          key={p.id} 
                          className={`p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 transition-colors ${
                            isFlaked ? 'bg-rose-950/20 hover:bg-rose-950/30' : 'hover:bg-slate-900/60'
                          }`}
                        >
                          {/* Player Info */}
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={p.photo}
                              alt={p.name}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-700 bg-slate-800 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-bold text-blue-400">{p.code}</span>
                                <span className="text-sm font-bold text-white truncate">#{p.number} {p.name}</span>
                                {isGK ? (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                                    🧤 GK (Free)
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[10px] font-mono">
                                    {p.position}
                                  </span>
                                )}
                              </div>

                              {/* Attendance vs Vote Comparison Badge */}
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                {isFlaked && (
                                  <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-bold flex items-center gap-1 animate-pulse">
                                    <AlertCircle className="w-3 h-3 text-rose-400" />
                                    <span>🚨 Vote ទៅ តែដល់ម៉ោងមិនទៅ (No-Show)</span>
                                  </span>
                                )}
                                {isAttendedAsVoted && (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1">
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span>✅ បានមកលេងពិតប្រាកដ (ទុកចិត្តបាន)</span>
                                  </span>
                                )}
                                {vote?.status === 'no' && !inSquad && (
                                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[11px] font-medium">
                                    ❌ អវត្តមាន (បានប្រាប់ទុកមុន)
                                  </span>
                                )}
                                {vote?.status === 'no' && inSquad && (
                                  <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] font-bold">
                                    ⚡ មកលេង (បាន Vote មិនទៅពីមុន)
                                  </span>
                                )}
                                {!vote && inSquad && (
                                  <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] font-bold">
                                    ⚡ មកលេង (មិនបាន Vote ទុកមុន)
                                  </span>
                                )}
                                {!vote && !inSquad && (
                                  <span className="text-[11px] text-slate-500">
                                    ⚪ មិនទាន់ Vote
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Voting Action Buttons & Reason */}
                          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
                            {/* Reason Input */}
                            <input
                              type="text"
                              placeholder="មូលហេតុ (ឧ. ជាប់ការងារ)"
                              value={vote?.reason || ''}
                              onChange={e => handleSetVote(p.id, vote?.status || 'no', e.target.value)}
                              className="w-36 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                            />

                            {/* Vote YES Button */}
                            <button
                              type="button"
                              onClick={() => handleSetVote(p.id, 'yes')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                vote?.status === 'yes'
                                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40 ring-2 ring-emerald-400'
                                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-300 border border-slate-800'
                              }`}
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                              <span>ទៅលេង</span>
                            </button>

                            {/* Vote NO Button */}
                            <button
                              type="button"
                              onClick={() => handleSetVote(p.id, 'no')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                vote?.status === 'no'
                                  ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40 ring-2 ring-rose-400'
                                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-300 border border-slate-800'
                              }`}
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                              <span>មិនទៅ</span>
                            </button>

                            {/* Clear Vote Button */}
                            {vote && (
                              <button
                                type="button"
                                onClick={() => handleSetVote(p.id, null)}
                                className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg text-xs"
                                title="លុបការ Vote"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Direct Squad Attendance Toggle */}
                            <button
                              type="button"
                              onClick={() => handleToggleSquadMember(p.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ml-1 ${
                                inSquad
                                  ? 'bg-blue-600 text-white shadow-sm'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              {inSquad ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-white" />
                                  <span>មានវត្តមាន</span>
                                </>
                              ) : (
                                <span>+ បញ្ចូលវត្តមាន</span>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 1: MATCH STATISTICS & TIMELINE */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              
              {/* MVP / Best Player Selection */}
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <div>
                    <h4 className="text-sm font-bold text-white">កីឡាករឆ្នើមប្រចាំការប្រកួត (Man of the Match - MVP)</h4>
                    <p className="text-xs text-slate-400">ជ្រើសរើសកីឡាករដែលលេងល្អដាច់គេក្នុងការប្រកួតនេះ</p>
                  </div>
                </div>

                <select
                  value={match.mvpPlayerId || ''}
                  onChange={e => onUpdateMatch({ ...match, mvpPlayerId: e.target.value || undefined })}
                  className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="">-- ជ្រើសរើស MVP --</option>
                  {match.squadPlayerIds.map(id => {
                    const p = playerMap.get(id);
                    return (
                      <option key={id} value={id}>
                        #{p?.number} {p?.name} ({p?.code})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Goals Log & Goal Adder */}
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    កត់ត្រាគ្រាប់បាល់ស៊ុតបញ្ចូលទី (Goals Log)
                  </h4>
                  <span className="text-xs text-emerald-400 font-bold">សរុប៖ {match.goals.length} គ្រាប់</span>
                </div>

                {/* Add Goal Form */}
                <form onSubmit={handleAddGoal} className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 bg-slate-900/90 p-3 rounded-lg border border-slate-800 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">អ្នកស៊ុត (Scorer)</label>
                    <select
                      value={newScorerId}
                      onChange={e => setNewScorerId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-md p-1.5 focus:outline-none focus:border-blue-500"
                    >
                      {players.map(p => (
                        <option key={p.id} value={p.id}>
                          #{p.number} {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">អ្នកបញ្ជូន (Assist)</label>
                    <select
                      value={newAssistId}
                      onChange={e => setNewAssistId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-md p-1.5 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- គ្មានអ្នកបញ្ជូន --</option>
                      {players.map(p => (
                        <option key={p.id} value={p.id}>
                          #{p.number} {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">នាទី (Minute)</label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={newGoalMinute}
                      onChange={e => setNewGoalMinute(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-md p-1.5 focus:outline-none focus:border-blue-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">ប្រភេទគ្រាប់បាល់</label>
                    <select
                      value={newGoalType}
                      onChange={e => setNewGoalType(e.target.value as MatchGoal['type'])}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-md p-1.5 focus:outline-none focus:border-blue-500"
                    >
                      <option value="regular">បាល់ធម្មតា (Regular)</option>
                      <option value="penalty">បាល់ប៉េណាល់ទី (Penalty)</option>
                      <option value="freekick">បាល់ហ្វ្រីឃីក (Free Kick)</option>
                      <option value="header">តែតបញ្ចូលទី (Header)</option>
                      <option value="own_goal">ស៊ុតចូលទីខ្លួនឯង (Own Goal)</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-3 rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>បញ្ចូលគ្រាប់បាល់</span>
                    </button>
                  </div>
                </form>

                {/* Goals Timeline List */}
                {match.goals.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-3">មិនទាន់មានការកត់ត្រាគ្រាប់បាល់នៅឡើយទេ</p>
                ) : (
                  <div className="space-y-2">
                    {match.goals.map(goal => {
                      const scorer = playerMap.get(goal.playerId);
                      const assist = goal.assistPlayerId ? playerMap.get(goal.assistPlayerId) : undefined;

                      return (
                        <div key={goal.id} className="flex items-center justify-between p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-xs">
                          <div className="flex items-center gap-3">
                            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono font-bold">
                              {goal.minute}'
                            </span>
                            <div>
                              <span className="font-bold text-white text-sm">
                                ⚽ #{scorer?.number} {goal.scorerName || scorer?.name || 'កីឡាករ'}
                              </span>
                              {assist && (
                                <span className="text-slate-400 ml-2">
                                  (បញ្ជូនដោយ៖ #{assist.number} {assist.name})
                                </span>
                              )}
                              <span className="ml-2 px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[10px]">
                                {goal.type === 'penalty' ? 'ប៉េណាល់ទី' : goal.type === 'freekick' ? 'ហ្វ្រីឃីក' : goal.type === 'header' ? 'តែត' : goal.type === 'own_goal' ? 'ចូលទីខ្លួនឯង' : 'គ្រាប់បាល់'}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleRemoveGoal(goal.id)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                            title="លុបគ្រាប់បាល់នេះ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Cards / Disciplinary Log */}
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    កាតព្រមាន & វិន័យ (Cards Log)
                  </h4>
                  <span className="text-xs text-amber-400 font-bold">{match.cards.length} កាត</span>
                </div>

                {/* Add Card Form */}
                <form onSubmit={handleAddCard} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-slate-900/90 p-3 rounded-lg border border-slate-800 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">កីឡាករ (Player)</label>
                    <select
                      value={newCardPlayerId}
                      onChange={e => setNewCardPlayerId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-md p-1.5 focus:outline-none focus:border-blue-500"
                    >
                      {players.map(p => (
                        <option key={p.id} value={p.id}>
                          #{p.number} {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">ប្រភេទកាត</label>
                    <select
                      value={newCardType}
                      onChange={e => setNewCardType(e.target.value as 'yellow' | 'red')}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-md p-1.5 focus:outline-none focus:border-blue-500"
                    >
                      <option value="yellow">🟨 កាតលឿង (Yellow)</option>
                      <option value="red">🟥 កាតក្រហម (Red)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">នាទី & មូលហេតុ</label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={newCardMinute}
                        onChange={e => setNewCardMinute(Number(e.target.value))}
                        className="w-16 bg-slate-950 border border-slate-700 text-white rounded-md p-1.5 text-center font-bold"
                      />
                      <input
                        type="text"
                        placeholder="មូលហេតុ (ឧ. ប៉ះទង្គិច)"
                        value={newCardReason}
                        onChange={e => setNewCardReason(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-md p-1.5"
                      />
                    </div>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-1.5 px-3 rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>បញ្ចូលកាត</span>
                    </button>
                  </div>
                </form>

                {/* Cards List */}
                {match.cards.length > 0 && (
                  <div className="space-y-1.5">
                    {match.cards.map(card => {
                      const p = playerMap.get(card.playerId);
                      return (
                        <div key={card.id} className="flex items-center justify-between p-2 bg-slate-900 rounded-lg border border-slate-800 text-xs">
                          <div className="flex items-center gap-2">
                            <span>{card.type === 'yellow' ? '🟨' : '🟥'}</span>
                            <span className="font-bold text-white">#{p?.number} {card.playerName || p?.name}</span>
                            <span className="text-slate-400">({card.minute}')</span>
                            {card.reason && <span className="text-slate-500 italic">- {card.reason}</span>}
                          </div>
                          <button
                            onClick={() => handleRemoveCard(card.id)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Match Notes */}
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  កំណត់សម្គាល់ & ការវាយតម្លៃការប្រកួត (Match Tactical Notes)
                </label>
                <textarea
                  rows={3}
                  value={match.matchNotes || ''}
                  onChange={e => onUpdateMatch({ ...match, matchNotes: e.target.value })}
                  placeholder="កត់ត្រាចំណុចខ្វះខាត ចំណុចខ្លាំង ការលេងជាក្រុម ឬសារដាស់តឿនកីឡាករ..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

            </div>
          )}

          {/* TAB 2: PLAYER FEES & PITCH EXPENSES */}
          {activeTab === 'finance' && (
            <div className="space-y-6">
              
              {/* Financial KPI Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block font-medium">ថ្លៃបង់ម្នាក់ៗ</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <input
                      type="number"
                      value={match.feePerPlayer}
                      onChange={e => onUpdateMatch({ ...match, feePerPlayer: Number(e.target.value) })}
                      className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-xs text-slate-400 font-bold">{currency === 'KHR' ? '៛' : '$'}</span>
                  </div>
                </div>

                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block font-medium">ចំណូលប្រមូលបាន</span>
                  <span className="text-base font-bold text-emerald-400 mt-0.5 block">
                    {formatCurrency(fin.totalCollected, currency)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ({fin.paidCount}/{fin.squadCount} នាក់)
                  </span>
                </div>

                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block font-medium">ចំណាយថ្លៃតារាង & ទឹក</span>
                  <span className="text-base font-bold text-rose-400 mt-0.5 block">
                    {formatCurrency(fin.totalExpense, currency)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ({match.expenses.length} ចំណាយ)
                  </span>
                </div>

                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block font-medium">សមតុល្យប្រកួត (សល់/ខ្វះ)</span>
                  <span className={`text-base font-bold mt-0.5 block ${fin.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {fin.netBalance >= 0 ? '+' : ''}{formatCurrency(fin.netBalance, currency)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {fin.netBalance >= 0 ? '🟢 សល់ទឹកប្រាក់' : '🔴 ខ្វះត្រូវទូទាត់'}
                  </span>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleMarkAllPaid}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>សម្គាល់ថាបានបង់ទាំងអស់</span>
                  </button>

                  <button
                    onClick={handleCopyTelegram}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>ចម្លងរបាយការណ៍ Telegram</span>
                  </button>
                </div>

                {fin.unpaidCount > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-950/30 px-3 py-1 rounded-lg border border-rose-800/40">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>នៅជំពាក់ {fin.unpaidCount} នាក់ ({formatCurrency(fin.totalPending, currency)})</span>
                  </div>
                )}
              </div>

              {/* Fee Exemption Policy Banner */}
              <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3 flex items-center gap-2.5 text-xs text-amber-200">
                <span className="text-base shrink-0">🎁</span>
                <div>
                  <span><strong>គោលការណ៍លើកលែងថ្លៃប្រកួត (Fee Exemption)៖</strong> អ្នកចាំទី (GK) និងកីឡាករដែលទទួលបានការលើកលែង (ឧ. លើកទឹកចិត្ត, លេងល្អដាច់គេ MVP, ឬស្នើសុំដោយសារជីវភាព) មិនតម្រូវឱ្យបង់ថ្លៃតារាងឡើយ និងមិនរាប់បញ្ចូលក្នុងប្រាក់ជំពាក់ឡើយ។</span>
                </div>
              </div>

              {/* Player Match Fee Collection Table */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden">
                <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-400" />
                    បញ្ជីកីឡាករបង់ប្រាក់ប្រកួតនេះ ({match.squadPlayerIds.length} នាក់)
                  </h4>
                  <span className="text-xs text-slate-400">ចុចប៊ូតុងដើម្បីកំណត់៖ បានបង់, លើកលែង, ឬជំពាក់</span>
                </div>

                <div className="divide-y divide-slate-800/60 max-h-96 overflow-y-auto">
                  {match.squadPlayerIds.map(pId => {
                    const p = playerMap.get(pId);
                    const isGK = p?.position === 'GK';
                    const feeInfo = match.playerFees?.[pId] || { 
                      hasPaid: false, 
                      amount: isGK ? 0 : match.feePerPlayer, 
                      isExempt: isGK 
                    };
                    const isExempt = feeInfo.isExempt || isGK;

                    return (
                      <div key={pId} className="p-3 space-y-2 hover:bg-slate-900/50 transition-colors">
                        <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                          {/* Player details */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <img
                              src={p?.photo}
                              alt={p?.name}
                              className="w-9 h-9 rounded-lg object-cover border border-slate-700 bg-slate-800 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-[11px] font-bold text-blue-400">{p?.code}</span>
                                <span className="text-xs font-bold text-white truncate">
                                  #{p?.number} {p?.name}
                                </span>
                                {isGK && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                                    🧤 GK Free
                                  </span>
                                )}
                                {feeInfo.isExempt && !isGK && (
                                  <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                                    🎁 លើកលែង
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400 block">
                                {feeInfo.hasPaid ? (
                                  <span className="text-emerald-400 flex items-center gap-1">
                                    <Check className="w-3 h-3" /> {isGK ? 'បានបង់ស្ម័គ្រចិត្ត' : 'បានបង់'} នៅ {feeInfo.paidAt || 'ថ្ងៃប្រកួត'}
                                  </span>
                                ) : isExempt ? (
                                  <span className="text-amber-300 font-semibold flex items-center gap-1">
                                    🎁 លើកលែងថ្លៃប្រកួត ({feeInfo.note || (isGK ? 'GK មិនបង់' : 'លើកទឹកចិត្ត/ស្នើសុំ')})
                                  </span>
                                ) : (
                                  <span className="text-rose-400">មិនទាន់បានបង់ (ជំពាក់)</span>
                                )}
                              </span>
                            </div>
                          </div>

                          {/* Amount & Note Inputs */}
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder={isExempt ? "មូលហេតុលើកលែង..." : "កំណត់សម្គាល់..."}
                              value={feeInfo.note || ''}
                              onChange={e => handleUpdatePlayerFeeDetails(pId, feeInfo.amount !== undefined ? feeInfo.amount : (isExempt ? 0 : match.feePerPlayer), e.target.value)}
                              className="hidden md:block w-36 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 placeholder-slate-600 focus:outline-none"
                            />

                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={feeInfo.amount !== undefined ? feeInfo.amount : (isExempt ? 0 : match.feePerPlayer)}
                                onChange={e => handleUpdatePlayerFeeDetails(pId, Number(e.target.value), feeInfo.note || '')}
                                className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-bold text-right focus:outline-none"
                              />
                              <span className="text-xs text-slate-400">{currency === 'KHR' ? '៛' : '$'}</span>
                            </div>

                            {/* State Selector Buttons */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleSetPlayerFeeState(pId, 'paid')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  feeInfo.hasPaid
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-300 border border-slate-800'
                                }`}
                                title="បានបង់ប្រាក់រួច"
                              >
                                <span>បង់រួច</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSetPlayerFeeState(pId, 'exempt', 'លើកលែងមិនបង់ (លើកទឹកចិត្ត/ស្នើសុំ)')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  feeInfo.isExempt || (isGK && !feeInfo.hasPaid)
                                    ? 'bg-amber-600 text-white shadow-sm'
                                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-300 border border-slate-800'
                                }`}
                                title="លើកលែងថ្លៃបង់ប្រកួតនេះ"
                              >
                                <span>🎁 លើកលែង</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSetPlayerFeeState(pId, 'unpaid')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  !feeInfo.hasPaid && !feeInfo.isExempt && !isGK
                                    ? 'bg-rose-600 text-white shadow-sm'
                                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-300 border border-slate-800'
                                }`}
                                title="មិនទាន់បង់ប្រាក់ (ជំពាក់)"
                              >
                                <span>ជំពាក់</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Quick Exemption Reason Chips when exempt or setting exemption */}
                        {(feeInfo.isExempt || isGK) && (
                          <div className="flex items-center gap-1.5 pt-1 pl-12 flex-wrap text-[11px]">
                            <span className="text-slate-400 font-medium">មូលហេតុលើកលែង៖</span>
                            <button
                              type="button"
                              onClick={() => handleSetPlayerFeeState(pId, 'exempt', 'លើកលែង៖ លេងបានល្អឆ្នើម MVP')}
                              className="px-2 py-0.5 rounded bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-800/80 transition-colors"
                            >
                              🌟 MVP លេងល្អ
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetPlayerFeeState(pId, 'exempt', 'លើកលែង៖ លើកទឹកចិត្តកីឡាករ')}
                              className="px-2 py-0.5 rounded bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800/80 transition-colors"
                            >
                              🤝 លើកទឹកចិត្ត
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetPlayerFeeState(pId, 'exempt', 'លើកលែង៖ ស្នើសុំដោយសារជីវភាព')}
                              className="px-2 py-0.5 rounded bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-800/80 transition-colors"
                            >
                              💬 ស្នើសុំមិនបង់
                            </button>
                            {isGK && (
                              <button
                                type="button"
                                onClick={() => handleSetPlayerFeeState(pId, 'exempt', 'អ្នកចាំទី (GK Exemption)')}
                                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-700 transition-colors"
                              >
                                🧤 អ្នកចាំទី GK
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pitch Rental Expenses & Other Costs Section */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Flag className="w-4 h-4 text-rose-400" />
                    ចំណាយថ្លៃជួលតារាង & ផ្សេងៗ (Pitch Rental & Expenses)
                  </h4>
                  <span className="text-xs font-bold text-rose-400">
                    សរុប៖ {formatCurrency(fin.totalExpense, currency)}
                  </span>
                </div>

                {/* Add Expense Form */}
                <form onSubmit={handleAddExpense} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">ប្រភេទចំណាយ</label>
                    <select
                      value={newExpCategory}
                      onChange={e => {
                        const cat = e.target.value as ExpenseCategory;
                        setNewExpCategory(cat);
                        if (cat === 'pitch') setNewExpTitle('ថ្លៃជួលតារាងបាល់');
                        if (cat === 'water') setNewExpTitle('ថ្លៃទឹកសុទ្ធ & ភេសជ្ជៈ');
                        if (cat === 'referee') setNewExpTitle('ថ្លៃអាជ្ញាកណ្តាល');
                        if (cat === 'firstaid') setNewExpTitle('ថ្នាំសង្គ្រោះបឋម / ស្ព្រៃយ៍បាញ់');
                      }}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-md p-1.5 focus:outline-none"
                    >
                      <option value="pitch">ថ្លៃជួលតារាងបាល់ (Pitch)</option>
                      <option value="water">ថ្លៃទឹកសុទ្ធ & ភេសជ្ជៈ (Water)</option>
                      <option value="referee">ថ្លៃអាជ្ញាកណ្តាល (Referee)</option>
                      <option value="firstaid">ថ្នាំសង្គ្រោះ & ស្ព្រៃយ៍ (First Aid)</option>
                      <option value="other">ចំណាយផ្សេងៗ (Other)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">បរិយាយចំណាយ</label>
                    <input
                      type="text"
                      value={newExpTitle}
                      onChange={e => setNewExpTitle(e.target.value)}
                      placeholder="ឧ. ថ្លៃតារាង 1 ម៉ោងកន្លះ"
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-md p-1.5 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">ទឹកប្រាក់ ({currency === 'KHR' ? '៛' : '$'})</label>
                    <input
                      type="number"
                      value={newExpAmount}
                      onChange={e => setNewExpAmount(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-md p-1.5 font-bold focus:outline-none"
                      required
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-1.5 px-3 rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>បញ្ចូលចំណាយ</span>
                    </button>
                  </div>
                </form>

                {/* Expenses List */}
                <div className="space-y-2">
                  {match.expenses.map(exp => (
                    <div key={exp.id} className="flex items-center justify-between p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                        <span className="font-bold text-white">{exp.title}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-rose-400 font-mono">
                          {formatCurrency(exp.amount, currency)}
                        </span>
                        <button
                          onClick={() => handleRemoveExpense(exp.id)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: LINEUP & SQUAD SELECTION */}
          {activeTab === 'lineup' && (
            <div className="space-y-6">
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white">កីឡាករត្រូវចូលរួមប្រកួត (Match Squad: {match.squadPlayerIds.length} នាក់)</h4>
                    <p className="text-xs text-slate-400">ជ្រើសរើសកីឡាករដែលមកចូលរួមប្រកួត ដើម្បីកត់ត្រាវត្តមាន និងថ្លៃតារាង</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {players.map(p => {
                    const isSelected = match.squadPlayerIds.includes(p.id);

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleToggleSquadMember(p.id)}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <img
                          src={p.photo}
                          alt={p.name}
                          className="w-8 h-8 rounded-lg object-cover border border-slate-700 bg-slate-800 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold truncate">#{p.number} {p.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">{p.code} • {p.position}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400 hidden sm:block">
            {match.status === 'finished' ? '✅ ការប្រកួតបានបញ្ចប់ និងកត់ត្រារួចរាល់' : '⏳ កំពុងរៀបចំកាលវិភាគប្រកួត'}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              រួចរាល់ & បិទ
            </button>
          </div>
        </div>

      </div>

      {/* Telegram Message Preview Modal */}
      {showTelegramPreview && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-sky-400" />
                សារសម្រាប់ផ្ញើចូលគ្រុប Telegram
              </h4>
              <button onClick={() => setShowTelegramPreview(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              readOnly
              rows={12}
              value={generateTelegramShareText(match, players, clubName, currency)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono leading-relaxed"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowTelegramPreview(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
              >
                បិទ
              </button>
              <button
                onClick={() => {
                  handleCopyTelegram();
                  setShowTelegramPreview(false);
                }}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>ចម្លងសារឥឡូវនេះ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Social Media & Multi-device Share Modal */}
      <MatchShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        match={match}
        players={players}
        settings={settings || {
          clubName,
          clubShortName: clubName,
          clubLogo: '⚽',
          currency,
          defaultFeePerPlayer: match.feePerPlayer,
          defaultPitchCost: 80000,
          managerName: '',
          managerPhone: '',
          homeKitColor: '#2563eb',
          awayKitColor: '#ffffff',
        }}
      />

      {showPosterModal && (
        <MatchPosterModal
          match={match}
          clubSettings={settings}
          clubName={clubName}
          currency={currency}
          onClose={() => setShowPosterModal(false)}
        />
      )}

    </div>
  );
};
