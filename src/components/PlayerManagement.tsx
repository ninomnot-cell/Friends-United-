import React, { useState, useRef, useEffect } from 'react';
import { Player, Position, PlayerStatus, Match } from '../types';
import { getPositionName, generateDefaultAvatar, formatCurrency, getPlayerStatusInfo, compressAndResizeImage } from '../utils/formatters';
import { calculatePlayerAttendance, getPlayersAtRiskOfDismissal } from '../utils/attendance';
import { 
  Plus, 
  Search, 
  Filter, 
  Phone, 
  Edit3, 
  Trash2, 
  Camera, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Shield, 
  Award,
  Calendar,
  X,
  UserCheck,
  Zap,
  DollarSign,
  UserX,
  AlertTriangle,
  RotateCcw,
  UserMinus
} from 'lucide-react';

interface PlayerManagementProps {
  players: Player[];
  matches: Match[];
  currency: 'KHR' | 'USD';
  absenceThreshold?: number;
  onAddPlayer: (player: Player) => void;
  onUpdatePlayer: (player: Player) => void;
  onDeletePlayer: (playerId: string) => void;
  isOpenNewPlayerModal: boolean;
  onCloseNewPlayerModal: () => void;
}

export const PlayerManagement: React.FC<PlayerManagementProps> = ({
  players,
  matches,
  currency,
  absenceThreshold = 6,
  onAddPlayer,
  onUpdatePlayer,
  onDeletePlayer,
  isOpenNewPlayerModal,
  onCloseNewPlayerModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPlayerForView, setSelectedPlayerForView] = useState<Player | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [showModalDirect, setShowModalDirect] = useState(false);

  // Dismissal modal states
  const [playerToDismiss, setPlayerToDismiss] = useState<Player | null>(null);
  const [dismissReason, setDismissReason] = useState('');
  const [showDismissModal, setShowDismissModal] = useState(false);

  // Registration Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [number, setNumber] = useState<number>(10);
  const [position, setPosition] = useState<Position>('MF');
  const [phone, setPhone] = useState('');
  const [preferredFoot, setPreferredFoot] = useState<'right' | 'left' | 'both'>('right');
  const [status, setStatus] = useState<PlayerStatus>('active');
  const [notes, setNotes] = useState('');
  const [formDismissedReason, setFormDismissedReason] = useState('');
  const [photo, setPhoto] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-generate next code
  const suggestNextCode = (): string => {
    const existingNumbers = players
      .map(p => {
        const match = p.code?.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      })
      .filter(n => !isNaN(n));
    const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNum = maxNum + 1;
    return `FC-${nextNum.toString().padStart(2, '0')}`;
  };

  const handleOpenAdd = () => {
    setCode(suggestNextCode());
    setName('');
    setNickname('');
    setNumber(Math.floor(Math.random() * 30) + 1);
    setPosition('MF');
    setPhone('');
    setPreferredFoot('right');
    setStatus('active');
    setNotes('');
    setPhoto('');
    setErrorMessage('');
    setEditingPlayer(null);
  };

  // Listen to open modal prop from header or dashboard
  useEffect(() => {
    if (isOpenNewPlayerModal) {
      handleOpenAdd();
      setShowModalDirect(true);
    }
  }, [isOpenNewPlayerModal]);

  // When editing existing player
  const handleStartEdit = (player: Player) => {
    setEditingPlayer(player);
    setCode(player.code);
    setName(player.name);
    setNickname(player.nickname || '');
    setNumber(player.number);
    setPosition(player.position);
    setPhone(player.phone);
    setPreferredFoot(player.preferredFoot || 'right');
    setStatus(player.status);
    setFormDismissedReason(player.dismissedReason || '');
    setNotes(player.notes || '');
    setPhoto(player.photo);
    setErrorMessage('');
  };

  // Dismissal action helpers
  const handleOpenDismiss = (player: Player) => {
    setPlayerToDismiss(player);
    const att = calculatePlayerAttendance(player, matches, absenceThreshold);
    setDismissReason(
      `អវត្តមាន ${att.consecutiveMissed} ប្រកួតជាប់ៗគ្នា (តាមគោលការណ៍វិន័យក្រុម អវត្តមាន ${absenceThreshold} ប្រកួតជាប់ៗគ្នាទើបដកចេញពីក្រុម)`
    );
    setShowDismissModal(true);
  };

  const handleConfirmDismiss = (deletePermanently: boolean = false) => {
    if (!playerToDismiss) return;
    if (deletePermanently) {
      onDeletePlayer(playerToDismiss.id);
    } else {
      const updated: Player = {
        ...playerToDismiss,
        status: 'dismissed',
        dismissedReason: dismissReason.trim() || `អវត្តមាន ${absenceThreshold} ប្រកួតជាប់ៗគ្នា តាមវិន័យក្រុម`,
        dismissedDate: new Date().toISOString().split('T')[0],
      };
      onUpdatePlayer(updated);
    }
    setShowDismissModal(false);
    setPlayerToDismiss(null);
  };

  const handleReinstate = (player: Player) => {
    const updated: Player = {
      ...player,
      status: 'active',
      dismissedReason: undefined,
      dismissedDate: undefined,
    };
    onUpdatePlayer(updated);
  };

  // Players at risk of dismissal (consecutiveMissed >= absenceThreshold and not yet dismissed)
  const atRiskPlayers = getPlayersAtRiskOfDismissal(players, matches, absenceThreshold);

  const handleBatchDismissAtRisk = () => {
    if (atRiskPlayers.length === 0) return;
    if (
      confirm(
        `តើអ្នកពិតជាចង់ដកកីឡាករចំនួន ${atRiskPlayers.length} នាក់ ដែលអវត្តមាន ${absenceThreshold} ប្រកួតជាប់ៗគ្នា ចេញពីក្រុមមែនទេ?`
      )
    ) {
      const today = new Date().toISOString().split('T')[0];
      atRiskPlayers.forEach(({ player, summary }) => {
        onUpdatePlayer({
          ...player,
          status: 'dismissed',
          dismissedReason: `អវត្តមានចំនួន ${summary.consecutiveMissed} ប្រកួតជាប់ៗគ្នា (តាមវិន័យក្រុម ៦ ប្រកួតជាប់ៗគ្នាទើបដកចេញ)`,
          dismissedDate: today,
        });
      });
    }
  };

  // Handle Photo File Upload with automatic compression
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('ទំហំរូបថតត្រូវតែតូចជាង 10MB');
        return;
      }
      try {
        const compressed = await compressAndResizeImage(file, 240);
        if (compressed) {
          setPhoto(compressed);
          setErrorMessage('');
        }
      } catch {
        setErrorMessage('មានបញ្ហាក្នុងការអានរូបថត');
      }
    }
    if (e.target) e.target.value = '';
  };

  // Generate avatar preset if user wants to use avatar
  const handleUsePresetAvatar = () => {
    const avatar = generateDefaultAvatar(name || 'Player', number, position);
    setPhoto(avatar);
  };

  // Handle Submit (Add or Edit)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('សូមបញ្ចូលឈ្មោះកីឡាករ');
      return;
    }
    if (!code.trim()) {
      setErrorMessage('សូមបញ្ចូលលេខកូដសម្គាល់កីឡាករ');
      return;
    }

    // Check duplicate code
    const isCodeDuplicate = players.some(
      p => (p.code || '').trim().toLowerCase() === code.trim().toLowerCase() && p.id !== editingPlayer?.id
    );
    if (isCodeDuplicate) {
      setErrorMessage(`លេខកូដ "${code}" ត្រូវបានប្រើប្រាស់រួចហើយ សូមជ្រើសរើសលេខកូដផ្សេង`);
      return;
    }

    const finalPhoto = photo || generateDefaultAvatar(name, number, position);

    if (editingPlayer) {
      const updated: Player = {
        ...editingPlayer,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        nickname: nickname.trim(),
        number: Number(number),
        position,
        phone: phone.trim(),
        preferredFoot,
        status,
        dismissedReason: status === 'dismissed' ? (formDismissedReason.trim() || `អវត្តមាន ${absenceThreshold} ប្រកួតជាប់ៗគ្នា តាមវិន័យក្រុម`) : undefined,
        dismissedDate: status === 'dismissed' ? (editingPlayer.dismissedDate || new Date().toISOString().split('T')[0]) : undefined,
        notes: notes.trim(),
        photo: finalPhoto,
      };
      onUpdatePlayer(updated);
      setEditingPlayer(null);
      setShowModalDirect(false);
      onCloseNewPlayerModal();
    } else {
      const newPlayer: Player = {
        id: `p-${Date.now()}`,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        nickname: nickname.trim(),
        number: Number(number),
        position,
        phone: phone.trim(),
        preferredFoot,
        status,
        dismissedReason: status === 'dismissed' ? (formDismissedReason.trim() || `អវត្តមាន ${absenceThreshold} ប្រកួតជាប់ៗគ្នា តាមវិន័យក្រុម`) : undefined,
        dismissedDate: status === 'dismissed' ? new Date().toISOString().split('T')[0] : undefined,
        notes: notes.trim(),
        photo: finalPhoto,
        dateJoined: new Date().toISOString().split('T')[0],
      };
      onAddPlayer(newPlayer);
      setShowModalDirect(false);
      onCloseNewPlayerModal();
    }
  };

  // Calculate individual player stats
  const getPlayerMetrics = (playerId: string) => {
    let appearances = 0;
    let goals = 0;
    let assists = 0;
    let yellowCards = 0;
    let redCards = 0;
    let feesPaid = 0;
    let feesPending = 0;

    matches.forEach(m => {
      if (m.squadPlayerIds?.includes(playerId)) {
        appearances++;
        const fee = m.playerFees?.[playerId];
        if (fee?.hasPaid) {
          feesPaid += fee.amount || m.feePerPlayer;
        } else {
          feesPending += m.feePerPlayer;
        }
      }

      (m.goals || []).forEach(g => {
        if (g.playerId === playerId) goals++;
        if (g.assistPlayerId === playerId) assists++;
      });

      (m.cards || []).forEach(c => {
        if (c.playerId === playerId) {
          if (c.type === 'yellow') yellowCards++;
          if (c.type === 'red') redCards++;
        }
      });
    });

    const paymentRate = appearances > 0 ? Math.round((feesPaid / (feesPaid + feesPending || 1)) * 100) : 100;

    return { appearances, goals, assists, yellowCards, redCards, feesPaid, feesPending, paymentRate };
  };

  // Filtered Players with full null-safety
  const filteredPlayers = players.filter(p => {
    const pName = p.name || '';
    const pCode = p.code || '';
    const pNickname = p.nickname || '';
    const pNumber = p.number !== undefined && p.number !== null ? p.number.toString() : '';
    const pPhone = p.phone || '';

    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = 
      !term ||
      pName.toLowerCase().includes(term) ||
      pCode.toLowerCase().includes(term) ||
      pNickname.toLowerCase().includes(term) ||
      pNumber.includes(term) ||
      pPhone.includes(term);
    
    const matchesPosition = positionFilter === 'all' || p.position === positionFilter;

    let matchesStatus = true;
    if (statusFilter === 'all') {
      matchesStatus = true;
    } else if (statusFilter === 'at_risk') {
      const att = calculatePlayerAttendance(p, matches, absenceThreshold);
      matchesStatus = att.isEligibleForDismissal && p.status !== 'dismissed';
    } else {
      matchesStatus = p.status === statusFilter;
    }

    return matchesSearch && matchesPosition && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Search, Filter & Add Header */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ស្វែងរកតាមឈ្មោះ, លេខកូដ (ឧ. FC-01), លេខអាវ, ឬលេខទូរស័ព្ទ..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Position & Status Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={positionFilter}
                onChange={e => setPositionFilter(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer pr-2"
              >
                <option value="all" className="bg-slate-900">គ្រប់តួនាទី (ទាំងអស់)</option>
                <option value="GK" className="bg-slate-900">អ្នកចាំទី (GK)</option>
                <option value="DF" className="bg-slate-900">ខ្សែការពារ (DF)</option>
                <option value="MF" className="bg-slate-900">ខ្សែបម្រើ (MF)</option>
                <option value="FW" className="bg-slate-900">ខ្សែប្រយុទ្ធ (FW)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer pr-2"
              >
                <option value="all" className="bg-slate-900">គ្រប់ស្ថានភាព ({players.length})</option>
                <option value="active" className="bg-slate-900">សកម្ម ({players.filter(p => p.status === 'active').length})</option>
                <option value="at_risk" className="bg-slate-900 text-rose-300">⚠️ អវត្តមានជាប់ៗគ្នា ≥ {absenceThreshold} ប្រកួត ({atRiskPlayers.length})</option>
                <option value="dismissed" className="bg-slate-900">🚫 បានដកចេញ ({players.filter(p => p.status === 'dismissed').length})</option>
                <option value="injured" className="bg-slate-900">មានរបួស ({players.filter(p => p.status === 'injured').length})</option>
                <option value="leave" className="bg-slate-900">សម្រាក ({players.filter(p => p.status === 'leave').length})</option>
              </select>
            </div>

            <button
              onClick={() => {
                handleOpenAdd();
                onAddPlayer; // prepare modal
                // Trigger modal opening
                if (!isOpenNewPlayerModal) {
                  // We can reuse editing state or trigger parent
                  setEditingPlayer(null);
                  setCode(suggestNextCode());
                  setName('');
                  setNickname('');
                  setNumber(10);
                  setPosition('MF');
                  setPhone('');
                  setPhoto('');
                  setEditingPlayer(null);
                  // We'll show the form modal below
                  setShowModalDirect(true);
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-blue-900/20 transition-colors cursor-pointer ml-auto md:ml-0"
            >
              <Plus className="w-4 h-4" />
              <span>ចុះឈ្មោះកីឡាករថ្មី</span>
            </button>
          </div>

        </div>

        {/* Quick Position & Status Counts */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400 overflow-x-auto pb-1">
          <span className="font-semibold text-slate-300 shrink-0">កីឡាករសរុប ({players.length}):</span>
          <span className="px-2 py-0.5 rounded-md bg-amber-400/10 text-amber-400 border border-amber-400/20 shrink-0">
            GK: {players.filter(p => p.position === 'GK').length}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-blue-400/10 text-blue-400 border border-blue-400/20 shrink-0">
            DF: {players.filter(p => p.position === 'DF').length}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 shrink-0">
            MF: {players.filter(p => p.position === 'MF').length}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-rose-400/10 text-rose-400 border border-rose-400/20 shrink-0">
            FW: {players.filter(p => p.position === 'FW').length}
          </span>
          <span className="text-slate-600 shrink-0">•</span>
          <span className="text-emerald-400 shrink-0">
            សកម្ម: {players.filter(p => p.status === 'active').length}
          </span>
          {atRiskPlayers.length > 0 && (
            <button
              onClick={() => setStatusFilter('at_risk')}
              className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold shrink-0 hover:bg-rose-500/30 transition-colors cursor-pointer flex items-center gap-1"
            >
              <AlertTriangle className="w-3 h-3" />
              <span>អវត្តមានជាប់ៗគ្នា ≥ {absenceThreshold} ប្រកួត ({atRiskPlayers.length})</span>
            </button>
          )}
          {players.filter(p => p.status === 'dismissed').length > 0 && (
            <button
              onClick={() => setStatusFilter('dismissed')}
              className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700 shrink-0 hover:text-white transition-colors cursor-pointer"
            >
              ដកចេញពីក្រុម: {players.filter(p => p.status === 'dismissed').length}
            </button>
          )}
          {players.filter(p => p.status === 'injured').length > 0 && (
            <span className="text-amber-400 shrink-0">
              របួស: {players.filter(p => p.status === 'injured').length}
            </span>
          )}
        </div>
      </div>

      {/* Disciplinary Alert Banner for 6 Consecutive Absences */}
      {atRiskPlayers.length > 0 && (
        <div className="bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-900 border-2 border-rose-600/60 rounded-2xl p-4 sm:p-5 shadow-xl shadow-rose-950/30 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm sm:text-base font-bold text-white">
                    វិន័យក្រុម៖ មានកីឡាករ {atRiskPlayers.length} នាក់ អវត្តមាន {absenceThreshold} ប្រកួតជាប់ៗគ្នា
                  </h4>
                  <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[11px] font-bold border border-rose-500/30">
                    ត្រូវដកចេញពីក្រុម
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                  តាមគោលការណ៍វិន័យក្រុមកីឡាបាល់ទាត់ Friends United FT កីឡាករដែលអវត្តមាន {absenceThreshold} ប្រកួតជាប់ៗគ្នា ទើបត្រូវដកឈ្មោះចេញពីក្រុម ដើម្បីរក្សាសាមគ្គីភាព និងភាពសកម្ម។
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {atRiskPlayers.map(({ player, summary }) => (
                    <div
                      key={player.id}
                      className="inline-flex items-center gap-2 px-2.5 py-1 bg-slate-950/80 border border-rose-700/60 rounded-lg text-xs"
                    >
                      <span className="font-bold text-white">#{player.number} {player.name}</span>
                      <span className="text-[11px] text-rose-400 font-semibold">(ខកខាន {summary.consecutiveMissed} ប្រកួតជាប់ៗគ្នា)</span>
                      <button
                        onClick={() => handleOpenDismiss(player)}
                        className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded cursor-pointer transition-colors"
                      >
                        ដកចេញ
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
              <button
                onClick={() => setStatusFilter('at_risk')}
                className="flex-1 md:flex-none px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
              >
                ត្រងមើល ({atRiskPlayers.length})
              </button>
              <button
                onClick={handleBatchDismissAtRisk}
                className="flex-1 md:flex-none px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-950/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserX className="w-4 h-4" />
                <span>ដកចេញទាំងអស់</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Players Grid */}
      {filteredPlayers.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center">
          <Shield className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">មិនមានកីឡាករត្រូវតាមលក្ខខណ្ឌស្វែងរក</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            សូមសាកល្បងផ្លាស់ប្តូរពាក្យស្វែងរក ឬចុះឈ្មោះកីឡាករថ្មីចូលក្នុងក្រុម។
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPlayers.map(player => {
            const pos = getPositionName(player.position);
            const metrics = getPlayerMetrics(player.id);
            const att = calculatePlayerAttendance(player, matches, absenceThreshold);

            return (
              <div
                key={player.id}
                className={`bg-slate-900/90 border rounded-2xl p-4 transition-all duration-200 hover:shadow-lg hover:shadow-slate-950/50 flex flex-col justify-between group relative overflow-hidden ${
                  player.status === 'dismissed'
                    ? 'border-rose-900/40 opacity-85 bg-slate-900/60'
                    : att.isEligibleForDismissal
                    ? 'border-rose-600/50 shadow-xs shadow-rose-950/40'
                    : 'border-slate-800 hover:border-slate-700/80'
                }`}
              >
                <div>
                  {/* Top Badge: Player ID Code & Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      {/* Unique Player Code Badge */}
                      <span className="px-2 py-0.5 bg-blue-950 text-blue-300 border border-blue-800/80 rounded-md text-[11px] font-mono font-bold tracking-wider shadow-inner">
                        {player.code}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${pos.bg} ${pos.color}`}>
                        {pos.labelKh}
                      </span>
                    </div>

                    {/* Status Indicator */}
                    {player.status === 'dismissed' ? (
                      <span className="px-2 py-0.5 bg-rose-500/15 text-rose-400 border border-rose-500/30 rounded-md text-[10px] font-bold flex items-center gap-1">
                        <UserX className="w-3 h-3" />
                        ដកចេញពីក្រុម
                      </span>
                    ) : player.status === 'injured' ? (
                      <span className="px-2 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-md text-[10px] font-bold">
                        របួស
                      </span>
                    ) : player.status === 'leave' ? (
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded-md text-[10px]">
                        សម្រាក
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        សកម្ម
                      </span>
                    )}
                  </div>

                  {/* Disciplinary Alert on Card if Missed >= Threshold Consecutive */}
                  {att.isEligibleForDismissal && player.status !== 'dismissed' && (
                    <div className="mb-3 p-2.5 bg-rose-950/60 border border-rose-600/60 rounded-xl flex items-center justify-between gap-2 shadow-xs">
                      <div className="flex items-center gap-1.5 text-xs text-rose-300 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>អវត្តមាន {att.consecutiveMissed} ប្រកួតជាប់ៗគ្នា</span>
                      </div>
                      <button
                        onClick={() => handleOpenDismiss(player)}
                        className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-bold shrink-0 shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                        title="ដកចេញពីក្រុមដោយសារអវត្តមាន ៦ ប្រកួតជាប់ៗគ្នា"
                      >
                        <UserX className="w-3 h-3" />
                        <span>ដកចេញពីក្រុម</span>
                      </button>
                    </div>
                  )}

                  {/* Warning on Card if Consecutive Missed is 4 or 5 */}
                  {att.isAtRiskWarning && player.status !== 'dismissed' && (
                    <div className="mb-3 p-2 bg-amber-950/40 border border-amber-600/50 rounded-xl flex items-center justify-between gap-2 shadow-xs">
                      <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>អវត្តមាន {att.consecutiveMissed}/{absenceThreshold} ប្រកួតជាប់គ្នា</span>
                      </div>
                      <span className="text-[10px] text-amber-300 font-semibold px-1.5 py-0.5 rounded bg-amber-500/20">
                        ប្រុងប្រយ័ត្ន
                      </span>
                    </div>
                  )}

                  {/* Dismissed reason banner */}
                  {player.status === 'dismissed' && (
                    <div className="mb-3 p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-400 truncate pr-1">
                        <span className="text-rose-400 font-semibold block">បានដកចេញពីក្រុម</span>
                        <span className="truncate block text-slate-300">{player.dismissedReason || `អវត្តមាន ${absenceThreshold} ប្រកួតជាប់ៗគ្នា`}</span>
                      </div>
                      <button
                        onClick={() => handleReinstate(player)}
                        className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-[11px] font-bold shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
                        title="ស្តារកីឡាករចូលក្រុមវិញ"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>ស្តារវិញ</span>
                      </button>
                    </div>
                  )}

                  {/* Player Photo, Name & Jersey Number */}
                  <div className="flex items-start gap-3.5 mb-3">
                    <div className="relative shrink-0">
                      <img
                        src={player.photo || generateDefaultAvatar(player.name, player.number, player.position)}
                        alt={player.name}
                        className="w-16 h-16 rounded-xl object-cover border border-slate-700 bg-slate-800 shadow-md"
                      />
                      {/* Jersey Number on Photo */}
                      <span className="absolute -bottom-1.5 -right-1.5 bg-slate-950 text-blue-400 border border-blue-500/40 rounded-md px-1.5 py-0.2 text-[11px] font-black shadow-sm">
                        #{player.number}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                        {player.name}
                      </h4>
                      {player.nickname && (
                        <p className="text-xs text-slate-400 font-medium truncate">
                          ({player.nickname})
                        </p>
                      )}
                      {player.phone && (
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span className="font-mono text-[11px]">{player.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Attendance Record Row */}
                  <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-950/50 rounded-xl border border-slate-800/80 text-[11px] mb-2.5">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>វត្តមានប្រកួត៖</span>
                    </div>
                    <div className="flex items-center gap-2 font-medium">
                      <span className="text-slate-300">
                        <strong className="text-white font-bold">{att.attendedCount}</strong>/{att.totalTeamMatches} ({att.attendanceRate}%)
                      </span>
                      {att.consecutiveMissed > 0 && (
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          att.isEligibleForDismissal
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : att.isAtRiskWarning
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          អវត្តមាន {att.consecutiveMissed} ជាប់គ្នា
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Player Performance & Fee Reliability Metrics */}
                  <div className="grid grid-cols-4 gap-1.5 py-2 px-2 bg-slate-950/60 rounded-xl border border-slate-800/80 text-center mb-3">
                    <div>
                      <span className="block text-[10px] text-slate-400 font-medium">ប្រកួត</span>
                      <span className="text-xs font-bold text-white">{metrics.appearances}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 font-medium">គ្រាប់បាល់</span>
                      <span className="text-xs font-bold text-emerald-400">{metrics.goals}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 font-medium">បញ្ជូន</span>
                      <span className="text-xs font-bold text-blue-400">{metrics.assists}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 font-medium">បង់លុយ</span>
                      <span className={`text-xs font-bold ${metrics.paymentRate >= 80 ? 'text-emerald-400' : metrics.paymentRate >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {metrics.paymentRate}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                  <button
                    onClick={() => setSelectedPlayerForView(player)}
                    className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>មើលប្រវត្តិ</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {player.status === 'dismissed' ? (
                      <button
                        onClick={() => handleReinstate(player)}
                        className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                        title="ស្តារកីឡាករចូលក្រុមវិញ"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenDismiss(player)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title="ដកចេញពីក្រុម"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleStartEdit(player)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="កែសម្រួលព័ត៌មាន"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`តើអ្នកពិតជាចង់លុបកីឡាករ "${player.name}" (${player.code}) ចេញពីក្រុមមែនទេ?`)) {
                          onDeletePlayer(player.id);
                        }
                      }}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      title="លុបកីឡាករជាអចិន្ត្រៃយ៍"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Direct Add/Edit Modal */}
      {(isOpenNewPlayerModal || editingPlayer || showModalDirect) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl my-8 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-400" />
                {editingPlayer ? `កែប្រែកីឡាករ៖ ${editingPlayer.name}` : 'ចុះឈ្មោះកីឡាករថ្មី (Player Registration)'}
              </h3>
              <button
                onClick={() => {
                  setEditingPlayer(null);
                  setShowModalDirect(false);
                  onCloseNewPlayerModal();
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mx-6 mt-4 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-center gap-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* Photo & Code Section */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                  រូបថត & លេខកូដសម្គាល់កីឡាករ (Photo & Player Code)
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Photo Preview & Upload */}
                  <div className="relative group">
                    <img
                      src={photo || generateDefaultAvatar(name || 'Player', number, position)}
                      alt="Player Preview"
                      className="w-24 h-24 rounded-2xl object-cover border-2 border-blue-500/40 bg-slate-800 shadow-md"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center rounded-2xl text-white text-xs font-medium transition-opacity cursor-pointer"
                    >
                      <Camera className="w-5 h-5 mb-1" />
                      <span>ប្តូររូប</span>
                    </button>
                  </div>

                  <div className="flex-1 space-y-2.5 w-full">
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>បញ្ចូលរូបថតផ្ទាល់</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleUsePresetAvatar}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>ប្រើរូបតំណាងស្វ័យប្រវត្តិ</span>
                      </button>

                      {photo && (
                        <button
                          type="button"
                          onClick={() => setPhoto('')}
                          className="text-xs text-rose-400 hover:underline"
                        >
                          លុបរូប
                        </button>
                      )}
                    </div>

                    {/* Unique Player Code Input */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        លេខកូដសម្គាល់កីឡាករ (Unique Code) <span className="text-rose-400">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={code}
                          onChange={e => setCode(e.target.value.toUpperCase())}
                          placeholder="ឧ. FC-01, FC-12"
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono uppercase tracking-wider focus:outline-none focus:border-blue-500"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setCode(suggestNextCode())}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono"
                          title="ស្នើលេខកូដបន្ទាប់"
                        >
                          ស្វ័យប្រវត្តិ
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">លេខកូដប្រើសម្រាប់សម្គាល់អត្តសញ្ញាណ និងតាមដានការបង់លុយ</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    ឈ្មោះកីឡាករ (Full Name) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="ឧ. សុខ វិបុល"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    ឈ្មោះហៅក្រៅ (Nickname)
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                    placeholder="ឧ. អាបុល, ណាតូ"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Jersey Number & Position */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    លេខអាវ (Jersey Number 1-99) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={number}
                    onChange={e => setNumber(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    តួនាទីលើទីលាន (Position) <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={position}
                    onChange={e => setPosition(e.target.value as Position)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="GK">អ្នកចាំទី (Goalkeeper - GK)</option>
                    <option value="DF">ខ្សែការពារ (Defender - DF)</option>
                    <option value="MF">ខ្សែបម្រើ (Midfielder - MF)</option>
                    <option value="FW">ខ្សែប្រយុទ្ធ (Forward - FW)</option>
                  </select>
                </div>
              </div>

              {/* Phone / Telegram & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    លេខទូរស័ព្ទ / Telegram
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="ឧ. 012 345 678"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    ស្ថានភាពកីឡាករ (Status)
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as PlayerStatus)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="active">សកម្ម (Active - ត្រៀមប្រកួត)</option>
                    <option value="injured">មានរបួស (Injured - សម្រាកព្យាបាល)</option>
                    <option value="leave">សម្រាក (On Leave)</option>
                    <option value="dismissed">🚫 បានដកចេញពីក្រុម (Dismissed from Team)</option>
                  </select>
                </div>
              </div>

              {/* Conditional Dismissal Reason Input */}
              {status === 'dismissed' && (
                <div className="p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-xl space-y-1.5 animate-in fade-in duration-150">
                  <label className="block text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <UserX className="w-3.5 h-3.5" />
                    <span>មូលហេតុនៃការដកចេញពីក្រុម (Dismissal Reason)</span>
                  </label>
                  <input
                    type="text"
                    value={formDismissedReason}
                    onChange={e => setFormDismissedReason(e.target.value)}
                    placeholder={`ឧ. អវត្តមាន ${absenceThreshold} ប្រកួតជាប់ៗគ្នា តាមវិន័យក្រុម`}
                    className="w-full bg-slate-950 border border-rose-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  />
                  <p className="text-[11px] text-rose-400/80">
                    កីឡាករដែលត្រូវបានដកចេញ នឹងមិនត្រូវបានរាប់ចូលក្នុងបញ្ជីកីឡាករសកម្ម ឬជម្រើស 11 នាក់ឡើយ។
                  </p>
                </div>
              )}

              {/* Preferred Foot & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    ជើងជំនាញ (Preferred Foot)
                  </label>
                  <select
                    value={preferredFoot}
                    onChange={e => setPreferredFoot(e.target.value as 'right' | 'left' | 'both')}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="right">ជើងស្តាំ (Right Foot)</option>
                    <option value="left">ជើងឆ្វេង (Left Foot)</option>
                    <option value="both">ទាំងសងខាង (Both Feet)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    កំណត់សម្គាល់បន្ថែម (Notes)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="ឧ. ស៊ុតហ្វ្រីឃីកល្អ, ជាប់ការងារថ្ងៃអាទិត្យ..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPlayer(null);
                    setShowModalDirect(false);
                    onCloseNewPlayerModal();
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingPlayer ? 'រក្សាទុកការកែប្រែ' : 'ចុះឈ្មោះកីឡាករ'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Player Detail & History Modal */}
      {selectedPlayerForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            
            {/* Header with Photo & Basic Info */}
            <div className="p-6 bg-gradient-to-br from-slate-800 to-slate-950 border-b border-slate-800 relative">
              <button
                onClick={() => setSelectedPlayerForView(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4">
                <img
                  src={selectedPlayerForView.photo || generateDefaultAvatar(selectedPlayerForView.name, selectedPlayerForView.number, selectedPlayerForView.position)}
                  alt={selectedPlayerForView.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-500/50 shadow-xl"
                />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-blue-950 text-blue-300 border border-blue-700 rounded text-xs font-mono font-bold">
                      {selectedPlayerForView.code}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-800 text-blue-400 rounded text-xs font-bold">
                      #{selectedPlayerForView.number}
                    </span>
                    <span className="text-xs text-slate-400">
                      {getPositionName(selectedPlayerForView.position).labelKh}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white">
                    {selectedPlayerForView.name}
                  </h3>
                  {selectedPlayerForView.nickname && (
                    <p className="text-xs text-slate-400">ហៅក្រៅ៖ {selectedPlayerForView.nickname}</p>
                  )}
                  {selectedPlayerForView.phone && (
                    <p className="text-xs text-slate-300 mt-1 flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {selectedPlayerForView.phone}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Performance & Financial Metrics */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {(() => {
                const metrics = getPlayerMetrics(selectedPlayerForView.id);
                const att = calculatePlayerAttendance(selectedPlayerForView, matches, absenceThreshold);

                return (
                  <>
                    {/* Status Notice if Dismissed */}
                    {selectedPlayerForView.status === 'dismissed' && (
                      <div className="p-3.5 bg-rose-950/60 border border-rose-600/60 rounded-xl text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-rose-300 font-bold">
                          <UserX className="w-4 h-4 text-rose-400" />
                          <span>ស្ថានភាព៖ បានដកចេញពីក្រុម (Dismissed from Team)</span>
                        </div>
                        {selectedPlayerForView.dismissedReason && (
                          <p className="text-slate-300 text-xs">មូលហេតុ៖ {selectedPlayerForView.dismissedReason}</p>
                        )}
                        {selectedPlayerForView.dismissedDate && (
                          <p className="text-slate-400 text-[11px]">កាលបរិច្ឆេទដកចេញ៖ {selectedPlayerForView.dismissedDate}</p>
                        )}
                      </div>
                    )}

                    {/* Attendance Analysis Section */}
                    <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-400" />
                          <span>ស្ថិតិវត្តមាន និងការអវត្តមានប្រកួត៖</span>
                        </span>
                        <span className={`text-xs font-bold ${
                          att.isEligibleForDismissal ? 'text-rose-400' : 'text-emerald-400'
                        }`}>
                          អត្រាចូលរួម {att.attendanceRate}%
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">ប្រកួតក្រុមសរុប</span>
                          <span className="text-base font-bold text-white">{att.totalTeamMatches}</span>
                        </div>
                        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">បានចូលរួម</span>
                          <span className="text-base font-bold text-emerald-400">{att.attendedCount}</span>
                        </div>
                        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">អវត្តមានជាប់គ្នា</span>
                          <span className={`text-base font-black ${att.isEligibleForDismissal ? 'text-rose-400' : att.isAtRiskWarning ? 'text-amber-400' : 'text-slate-300'}`}>
                            {att.consecutiveMissed} <span className="text-xs font-normal text-slate-400">ប្រកួត</span>
                          </span>
                        </div>
                      </div>

                      {att.isEligibleForDismissal && selectedPlayerForView.status !== 'dismissed' && (
                        <div className="p-2.5 bg-rose-950/60 border border-rose-600/60 rounded-xl text-xs text-rose-200 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                            <span>អវត្តមាន {att.consecutiveMissed} ប្រកួតជាប់ៗគ្នា (ត្រូវដកឈ្មោះចេញពីក្រុម)</span>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedPlayerForView(null);
                              handleOpenDismiss(selectedPlayerForView);
                            }}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer transition-colors"
                          >
                            ដកចេញ
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                        <span className="text-[11px] text-slate-400 block font-medium">ការប្រកួត</span>
                        <span className="text-lg font-black text-white">{metrics.appearances}</span>
                      </div>
                      <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                        <span className="text-[11px] text-slate-400 block font-medium">គ្រាប់បាល់</span>
                        <span className="text-lg font-black text-emerald-400">{metrics.goals}</span>
                      </div>
                      <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                        <span className="text-[11px] text-slate-400 block font-medium">បញ្ជូនបាល់</span>
                        <span className="text-lg font-black text-blue-400">{metrics.assists}</span>
                      </div>
                    </div>

                    {/* Financial Reliability */}
                    <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">ភាពទៀងទាត់នៃការបង់ថ្លៃតារាង៖</span>
                        <span className={`font-bold ${metrics.paymentRate >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {metrics.paymentRate}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                        <span className="text-slate-400">បានបង់សរុប៖</span>
                        <span className="font-bold text-emerald-400">{formatCurrency(metrics.feesPaid, currency)}</span>
                      </div>
                      {metrics.feesPending > 0 && (
                        <div className="flex items-center justify-between text-xs text-rose-400 font-semibold pt-1 border-t border-slate-800/80">
                          <span>ជំពាក់មិនទាន់បង់៖</span>
                          <span>{formatCurrency(metrics.feesPending, currency)}</span>
                        </div>
                      )}
                    </div>

                    {/* Additional Notes */}
                    {selectedPlayerForView.notes && (
                      <div className="text-xs text-slate-400 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                        <span className="font-semibold text-slate-300 block mb-1">កំណត់សម្គាល់៖</span>
                        <p>{selectedPlayerForView.notes}</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
              {selectedPlayerForView.status === 'dismissed' ? (
                <button
                  onClick={() => {
                    handleReinstate(selectedPlayerForView);
                    setSelectedPlayerForView({
                      ...selectedPlayerForView,
                      status: 'active',
                      dismissedReason: undefined,
                      dismissedDate: undefined,
                    });
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ស្តារចូលក្រុមវិញ</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    const p = selectedPlayerForView;
                    setSelectedPlayerForView(null);
                    handleOpenDismiss(p);
                  }}
                  className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>ដកចេញពីក្រុម</span>
                </button>
              )}

              <button
                onClick={() => setSelectedPlayerForView(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
              >
                បិទ
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Dismiss Confirmation Modal */}
      {showDismissModal && playerToDismiss && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-rose-600/50 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 bg-gradient-to-b from-rose-950/50 to-slate-900 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
                  <UserX className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">ដកកីឡាករចេញពីក្រុម</h3>
                  <p className="text-xs text-rose-300 font-medium">
                    អនុវត្តគោលការណ៍វិន័យ អវត្តមាន {absenceThreshold} ប្រកួតជាប់ៗគ្នា ទើបដកចេញពីក្រុម
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Target Player Card */}
              <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <img
                  src={playerToDismiss.photo || generateDefaultAvatar(playerToDismiss.name, playerToDismiss.number, playerToDismiss.position)}
                  alt={playerToDismiss.name}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950 px-1.5 py-0.2 rounded border border-blue-800/80">
                      {playerToDismiss.code}
                    </span>
                    <span className="text-xs text-slate-400">#{playerToDismiss.number}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white truncate">{playerToDismiss.name}</h4>
                  <p className="text-xs text-slate-400">
                    {getPositionName(playerToDismiss.position).labelKh} • {playerToDismiss.phone || 'គ្មានលេខទូរស័ព្ទ'}
                  </p>
                </div>
              </div>

              {/* Attendance facts */}
              {(() => {
                const att = calculatePlayerAttendance(playerToDismiss, matches, absenceThreshold);
                return (
                  <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-rose-300 block">មូលដ្ឋាននៃការដកចេញ៖</span>
                    <p className="text-slate-300">
                      • អវត្តមាន <strong className="text-rose-400">{att.consecutiveMissed}</strong> ប្រកួតជាប់ៗគ្នា (ដល់កម្រិតវិន័យក្រុម {absenceThreshold} ប្រកួតជាប់ៗគ្នា)
                    </p>
                    <p className="text-slate-400">
                      • បានអវត្តមានសរុប {att.missedCount} នៃ {att.totalTeamMatches} ប្រកួត
                    </p>
                    <p className="text-slate-400 text-[11px] pt-1">
                      (កីឡាករដែលត្រូវបានដកចេញ នឹងត្រូវរក្សាទុកក្នុងប្រព័ន្ធដោយប្តូរស្ថានភាពជា «បានដកចេញ» ដើម្បីរក្សាស្ថិតិពីមុន)
                    </p>
                  </div>
                );
              })()}

              {/* Reason Input */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  មូលហេតុនៃការដកចេញ (កំណត់ត្រា)
                </label>
                <textarea
                  value={dismissReason}
                  onChange={e => setDismissReason(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  placeholder="បញ្ជាក់មូលហេតុ..."
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDismissModal(false);
                  setPlayerToDismiss(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
              >
                បោះបង់
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleConfirmDismiss(true)}
                  className="px-3 py-2 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                  title="លុបទិន្នន័យចោលទាំងស្រុងពីប្រព័ន្ធ"
                >
                  លុបចោលទាំងស្រុង
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmDismiss(false)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-950/40 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>បញ្ជាក់ដកចេញ</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
