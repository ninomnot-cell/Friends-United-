import React, { useState, useRef } from 'react';
import { Match, Player, MatchFormat } from '../types';
import { formatDateKh, formatCurrency, calculateMatchFinance, generateTelegramShareText, compressAndResizeImage } from '../utils/formatters';
import { MatchDetailModal } from './MatchDetailModal';
import { 
  Plus, 
  Calendar, 
  Clock, 
  MapPin, 
  Trophy, 
  DollarSign, 
  Users, 
  Share2, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Copy,
  ChevronRight,
  Filter,
  Check,
  Camera
} from 'lucide-react';

interface MatchSchedulerProps {
  matches: Match[];
  players: Player[];
  clubName: string;
  currency: 'KHR' | 'USD';
  defaultFeePerPlayer: number;
  defaultPitchCost: number;
  onAddMatch: (match: Match) => void;
  onUpdateMatch: (match: Match) => void;
  onDeleteMatch: (matchId: string) => void;
  isOpenNewMatchModal: boolean;
  onOpenNewMatchModal: () => void;
  onCloseNewMatchModal: () => void;
}

export const MatchScheduler: React.FC<MatchSchedulerProps> = ({
  matches,
  players,
  clubName,
  currency,
  defaultFeePerPlayer,
  defaultPitchCost,
  onAddMatch,
  onUpdateMatch,
  onDeleteMatch,
  isOpenNewMatchModal,
  onOpenNewMatchModal,
  onCloseNewMatchModal,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'scheduled' | 'finished'>('all');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [copiedMatchId, setCopiedMatchId] = useState<string | null>(null);

  // New Match Form State
  const [opponentName, setOpponentName] = useState('');
  const [opponentLogo, setOpponentLogo] = useState('⚽');
  const opponentLogoInputRef = useRef<HTMLInputElement>(null);

  const handleOpponentLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressAndResizeImage(file, 240);
        if (compressed) {
          setOpponentLogo(compressed);
        }
      } catch {
        console.error('Error uploading opponent logo image');
      }
    }
    if (e.target) e.target.value = '';
  };
  const [date, setDate] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() + 3); // Suggest 3 days ahead
    return today.toISOString().split('T')[0];
  });
  const [time, setTime] = useState('18:30');
  const [stadium, setStadium] = useState('តារាងបាល់ ដឺប្លូស្ពត (The Blue Sports)');
  const [pitchNumber, setPitchNumber] = useState('តារាង 7 នាក់ A');
  const [format, setFormat] = useState<MatchFormat>('7v7');
  const [feePerPlayer, setFeePerPlayer] = useState(defaultFeePerPlayer);
  const [pitchCost, setPitchCost] = useState(defaultPitchCost);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(
    players.filter(p => p.status === 'active').map(p => p.id)
  );

  const handleCreateMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opponentName.trim()) return;

    const playerMap = new Map(players.map(p => [p.id, p]));
    const initialPlayerFees: Record<string, { hasPaid: boolean; amount: number; isExempt?: boolean }> = {};
    selectedPlayerIds.forEach(pId => {
      const p = playerMap.get(pId);
      const isGK = p?.position === 'GK';
      initialPlayerFees[pId] = {
        hasPaid: false,
        amount: isGK ? 0 : feePerPlayer,
        isExempt: isGK,
      };
    });

    const newMatch: Match = {
      id: `m-${Date.now()}`,
      matchNumber: matches.length + 1,
      date,
      time,
      stadium: stadium.trim(),
      pitchNumber: pitchNumber.trim(),
      format,
      opponentName: opponentName.trim(),
      opponentLogo,
      status: 'scheduled',
      homeScore: 0,
      awayScore: 0,
      feePerPlayer,
      squadPlayerIds: selectedPlayerIds,
      startingLineupIds: selectedPlayerIds.slice(0, format === '5v5' ? 5 : format === '7v7' ? 7 : 11),
      playerFees: initialPlayerFees,
      expenses: [
        {
          id: `exp-${Date.now()}`,
          category: 'pitch',
          title: `ថ្លៃជួលតារាង ${format}`,
          amount: pitchCost,
        },
      ],
      goals: [],
      cards: [],
    };

    onAddMatch(newMatch);
    onCloseNewMatchModal();

    // Reset fields
    setOpponentName('');
  };

  const handleCopyTelegram = (match: Match) => {
    const text = generateTelegramShareText(match, players, clubName, currency);
    navigator.clipboard.writeText(text);
    setCopiedMatchId(match.id);
    setTimeout(() => setCopiedMatchId(null), 2500);
  };

  const filteredMatches = matches
    .filter(m => {
      if (activeFilter === 'scheduled') return m.status === 'scheduled' || m.status === 'live';
      if (activeFilter === 'finished') return m.status === 'finished';
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      
      {/* Top Filter & Create Action Header */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeFilter === 'all' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ការប្រកួតទាំងអស់ ({matches.length})
          </button>
          <button
            onClick={() => setActiveFilter('scheduled')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeFilter === 'scheduled' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            កាលវិភាគខាងមុខ ({matches.filter(m => m.status === 'scheduled' || m.status === 'live').length})
          </button>
          <button
            onClick={() => setActiveFilter('finished')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeFilter === 'finished' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            បានប្រកួតរួច ({matches.filter(m => m.status === 'finished').length})
          </button>
        </div>

        {/* Create Schedule Button */}
        <button
          onClick={onOpenNewMatchModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-emerald-900/20 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>បង្កើតកាលវិភាគប្រកួតថ្មី</span>
        </button>
      </div>

      {/* Matches List */}
      {filteredMatches.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">មិនទាន់មានកាលវិភាគប្រកួតឡើយ</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            ចុចលើប៊ូតុង "បង្កើតកាលវិភាគប្រកួតថ្មី" ដើម្បីកំណត់កាលបរិច្ឆេទ ទីលាន និងគូប្រកួត។
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredMatches.map(match => {
            const fin = calculateMatchFinance(match);
            const isFinished = match.status === 'finished';
            const isLive = match.status === 'live';

            return (
              <div
                key={match.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 transition-all duration-200 shadow-sm hover:shadow-lg hover:shadow-slate-950/40 relative overflow-hidden"
              >
                {/* Match Status Strip */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800/80 text-xs">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-800 font-mono font-bold">
                      ប្រកួតទី #{match.matchNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                      ទម្រង់ {match.format}
                    </span>
                    <span className="flex items-center gap-1 text-slate-300">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      {formatDateKh(match.date)}
                    </span>
                    <span className="flex items-center gap-1 text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      {match.time}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isFinished ? (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                        <CheckCircle2 className="w-3 h-3" /> បានបញ្ចប់
                      </span>
                    ) : isLive ? (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-rose-400"></span> កំពុងប្រកួត
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30 text-[11px] font-bold">
                        ⏳ កាលវិភាគគ្រោងទុក
                      </span>
                    )}
                  </div>
                </div>

                {/* Score & Teams Card */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  
                  {/* Home & Away Teams & Score */}
                  <div className="md:col-span-7 flex items-center justify-between sm:justify-start gap-4">
                    {/* Home Team */}
                    <div className="text-right flex-1 sm:flex-initial sm:w-44">
                      <h4 className="text-base font-bold text-white truncate">{clubName}</h4>
                      <span className="text-[11px] text-blue-400">ម្ចាស់ផ្ទះ</span>
                    </div>

                    {/* Big Score Box */}
                    <div className="px-4 py-2 bg-slate-950 rounded-xl border border-slate-800 text-center min-w-[90px] shadow-inner">
                      {isFinished || isLive ? (
                        <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-wider">
                          {match.homeScore} : {match.awayScore}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block py-1">
                          VS
                        </span>
                      )}
                    </div>

                    {/* Away Team */}
                    <div className="text-left flex-1 sm:flex-initial sm:w-44">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden text-base shadow-sm">
                          {match.opponentLogo && (match.opponentLogo.startsWith('http') || match.opponentLogo.startsWith('data:') || match.opponentLogo.includes('/') || match.opponentLogo.includes('.')) ? (
                            <img src={match.opponentLogo} alt={match.opponentName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{match.opponentLogo || '⚽'}</span>
                          )}
                        </div>
                        <h4 className="text-base font-bold text-slate-200 truncate">{match.opponentName}</h4>
                      </div>
                      <span className="text-[11px] text-rose-400 font-medium">គូប្រកួត</span>
                    </div>
                  </div>

                  {/* Stadium & Location */}
                  <div className="md:col-span-5 text-xs text-slate-400 space-y-1">
                    <p className="flex items-center gap-1.5 text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span className="font-semibold text-white">{match.stadium}</span>
                    </p>
                    {match.pitchNumber && (
                      <p className="pl-5 text-slate-400">{match.pitchNumber}</p>
                    )}
                  </div>

                </div>

                {/* Match Finances & Squad Highlights */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">កីឡាករចូលរួម</span>
                    <span className="font-bold text-white flex items-center gap-1 mt-0.5">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      {match.squadPlayerIds.length} នាក់
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">បង់លុយរួច</span>
                    <span className="font-bold text-emerald-400 mt-0.5 block">
                      {fin.paidCount}/{fin.squadCount} នាក់ ({formatCurrency(fin.totalCollected, currency)})
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">ថ្លៃតារាង & ចំណាយ</span>
                    <span className="font-bold text-rose-400 mt-0.5 block">
                      {formatCurrency(fin.totalExpense, currency)}
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">សមតុល្យសល់/ខ្វះ</span>
                    <span className={`font-bold mt-0.5 block ${fin.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {fin.netBalance >= 0 ? '+' : ''}{formatCurrency(fin.netBalance, currency)}
                    </span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-800/60">
                  <button
                    onClick={() => handleCopyTelegram(match)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {copiedMatchId === match.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>បានចម្លងរួចរាល់!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>ចម្លងរបាយការណ៍ Telegram</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (confirm(`តើអ្នកពិតជាចង់លុបការប្រកួតទល់នឹង "${match.opponentName}" មែនទេ?`)) {
                          onDeleteMatch(match.id);
                        }
                      }}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      title="លុបការប្រកួតនេះ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setSelectedMatch(match)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
                    >
                      <span>គ្រប់គ្រងស្ថិតិ & ថ្លៃតារាង</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Match Detail & Financial Tracker Modal */}
      {selectedMatch && (
        <MatchDetailModal
          match={selectedMatch}
          players={players}
          clubName={clubName}
          currency={currency}
          onUpdateMatch={updated => {
            onUpdateMatch(updated);
            setSelectedMatch(updated);
          }}
          onClose={() => setSelectedMatch(null)}
        />
      )}

      {/* Create New Match Modal */}
      {isOpenNewMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl my-6 overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                បង្កើតកាលវិភាគប្រកួតថ្មី (New Match Schedule)
              </h3>
              <button
                onClick={onCloseNewMatchModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMatch} className="p-6 space-y-4">
              
              {/* Opponent Team & Logo */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      ឈ្មោះក្រុមគូប្រកួត (Opponent Name) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="ឧ. Dragon FC, Blue Sky FC..."
                      value={opponentName}
                      onChange={e => setOpponentName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Logo គូប្រកួត (Opponent Logo Image & Emoji)
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden text-lg shadow-inner">
                        {opponentLogo && (opponentLogo.startsWith('http') || opponentLogo.startsWith('data:') || opponentLogo.includes('/') || opponentLogo.includes('.')) ? (
                          <img src={opponentLogo} alt="Opponent Logo" className="w-full h-full object-cover" />
                        ) : (
                          <span>{opponentLogo || '⚽'}</span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={opponentLogo}
                        onChange={e => setOpponentLogo(e.target.value)}
                        placeholder="Link រូបភាព ឬ Emoji..."
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => opponentLogoInputRef.current?.click()}
                        className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                        title="ឡើងរូប Logo គូប្រកួត"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">ឡើងរូប</span>
                      </button>
                      <input
                        type="file"
                        ref={opponentLogoInputRef}
                        accept="image/*"
                        onChange={handleOpponentLogoUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Preset Opponent Emojis */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-900">
                  <span className="text-[10px] text-slate-400">ជ្រើសរើស Emoji គូប្រកួត៖</span>
                  {['⚽', '🐉', '🦅', '🐅', '🦁', '⚡', '🤝', '🔥', '🛡️', '🏆', '👑', '🐺'].map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setOpponentLogo(icon)}
                      className={`w-6 h-6 rounded bg-slate-900 border text-xs flex items-center justify-center hover:scale-110 transition-transform cursor-pointer ${opponentLogo === icon ? 'border-rose-400 bg-rose-950/60 text-white' : 'border-slate-800 text-slate-300'}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    កាលបរិច្ឆេទប្រកួត (Match Date)
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    ម៉ោងចាប់ផ្តើម (Kickoff Time)
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Stadium & Pitch Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    ឈ្មោះតារាងបាល់ / ទីលាន (Stadium)
                  </label>
                  <input
                    type="text"
                    value={stadium}
                    onChange={e => setStadium(e.target.value)}
                    placeholder="ឧ. ដឺប្លូស្ពត, ធីខេ, កោះពេជ្រ..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    លេខតារាង / ទីតាំង
                  </label>
                  <input
                    type="text"
                    value={pitchNumber}
                    onChange={e => setPitchNumber(e.target.value)}
                    placeholder="ឧ. តារាង 7 នាក់ A, តារាងលេខ 3"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Format, Fee Per Player, and Pitch Cost */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    ទម្រង់ប្រកួត (Format)
                  </label>
                  <select
                    value={format}
                    onChange={e => setFormat(e.target.value as MatchFormat)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none cursor-pointer"
                  >
                    <option value="7v7">7 នាក់ (7 vs 7)</option>
                    <option value="5v5">5 នាក់ (5 vs 5)</option>
                    <option value="9v9">9 នាក់ (9 vs 9)</option>
                    <option value="11v11">11 នាក់ (11 vs 11)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    ថ្លៃបង់ម្នាក់ៗ ({currency === 'KHR' ? '៛' : '$'})
                  </label>
                  <input
                    type="number"
                    value={feePerPlayer}
                    onChange={e => setFeePerPlayer(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    ថ្លៃជួលតារាង ({currency === 'KHR' ? '៛' : '$'})
                  </label>
                  <input
                    type="number"
                    value={pitchCost}
                    onChange={e => setPitchCost(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Squad Selection Preview */}
              <div className="pt-2">
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  ជ្រើសរើសកីឡាករត្រូវចូលរួម ({selectedPlayerIds.length} នាក់បានជ្រើសរើស)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-950 rounded-xl border border-slate-800">
                  {players.filter(p => p.status !== 'dismissed').map(p => {
                    const isChecked = selectedPlayerIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer ${
                          isChecked ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedPlayerIds([...selectedPlayerIds, p.id]);
                            } else {
                              setSelectedPlayerIds(selectedPlayerIds.filter(id => id !== p.id));
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-0"
                        />
                        <span className="truncate">#{p.number} {p.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onCloseNewMatchModal}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>បង្កើតកាលវិភាគប្រកួត</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
