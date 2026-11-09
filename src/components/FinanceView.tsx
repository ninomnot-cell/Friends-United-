import React, { useState } from 'react';
import { Match, Player, ClubSettings } from '../types';
import { formatCurrency, formatDateKh, calculateMatchFinance } from '../utils/formatters';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertCircle, 
  CheckCircle2, 
  Receipt, 
  Copy, 
  Check, 
  Search, 
  Calendar, 
  Users,
  DollarSign,
  PieChart
} from 'lucide-react';

interface FinanceViewProps {
  matches: Match[];
  players: Player[];
  settings: ClubSettings;
  onUpdateMatch: (updatedMatch: Match) => void;
  onSelectMatch: (match: Match) => void;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  matches,
  players,
  settings,
  onUpdateMatch,
  onSelectMatch,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedDebtText, setCopiedDebtText] = useState(false);

  const playerMap = new Map(players.map(p => [p.id, p]));

  // Global Financial Aggregations
  let grandTotalIncome = 0;
  let grandTotalExpenses = 0;
  let grandTotalPending = 0;
  let grandTotalExemptionsCount = 0;

  // Expense categories aggregation
  const expenseByCategory: Record<string, number> = {
    pitch: 0,
    water: 0,
    referee: 0,
    firstaid: 0,
    other: 0,
  };

  // Collect all unpaid debts per player & per match
  interface UnpaidRecord {
    matchId: string;
    matchNumber: number;
    matchDate: string;
    opponentName: string;
    playerId: string;
    player: Player | undefined;
    amount: number;
    note?: string;
  }

  const unpaidList: UnpaidRecord[] = [];

  matches.forEach(m => {
    (m.squadPlayerIds || []).forEach(pId => {
      const fee = m.playerFees?.[pId];
      const p = playerMap.get(pId);
      const isGK = p?.position === 'GK';
      const isExempt = fee?.isExempt || isGK;

      if (isExempt) {
        grandTotalExemptionsCount++;
        if (fee?.hasPaid) {
          grandTotalIncome += fee.amount !== undefined ? fee.amount : m.feePerPlayer;
        }
      } else if (fee?.hasPaid) {
        grandTotalIncome += fee.amount !== undefined ? fee.amount : m.feePerPlayer;
      } else {
        // Non-exempt players who haven't paid incur debt
        const debt = fee?.amount !== undefined ? fee.amount : m.feePerPlayer;
        grandTotalPending += debt;
        unpaidList.push({
          matchId: m.id,
          matchNumber: m.matchNumber,
          matchDate: m.date,
          opponentName: m.opponentName,
          playerId: pId,
          player: p,
          amount: debt,
          note: fee?.note,
        });
      }
    });

    (m.expenses || []).forEach(exp => {
      grandTotalExpenses += exp.amount || 0;
      expenseByCategory[exp.category] = (expenseByCategory[exp.category] || 0) + (exp.amount || 0);
    });
  });

  const netTreasury = grandTotalIncome - grandTotalExpenses;

  // Quick mark paid from debt list
  const handleSettleDebt = (rec: UnpaidRecord) => {
    const match = matches.find(m => m.id === rec.matchId);
    if (!match) return;

    const updatedFees = {
      ...(match.playerFees || {}),
      [rec.playerId]: {
        hasPaid: true,
        amount: rec.amount,
        paidAt: new Date().toISOString().split('T')[0],
        note: 'បានទូទាត់រួច',
      }
    };

    onUpdateMatch({
      ...match,
      playerFees: updatedFees,
    });
  };

  // Quick mark exempt from debt list
  const handleExemptDebt = (rec: UnpaidRecord, reason: string = 'លើកលែងមិនបង់ប្រាក់ (លើកទឹកចិត្ត/ស្នើសុំ)') => {
    const match = matches.find(m => m.id === rec.matchId);
    if (!match) return;

    const updatedFees = {
      ...(match.playerFees || {}),
      [rec.playerId]: {
        hasPaid: false,
        amount: 0,
        note: reason,
        isExempt: true,
      }
    };

    onUpdateMatch({
      ...match,
      playerFees: updatedFees,
    });
  };

  // Generate Telegram debt reminder text
  const handleCopyDebtReminder = () => {
    let msg = `📢 បញ្ជីកីឡាករជំពាក់ថ្លៃតារាងបាល់ទាត់ | ${settings.clubName} 📢\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💰 ប្រាក់ជំពាក់សរុបមិនទាន់បង់: ${formatCurrency(grandTotalPending, settings.currency)} (${unpaidList.length} ករណី)\n\n`;

    // Group by player
    const debtsByPlayer: Record<string, { player?: Player; total: number; matches: string[] }> = {};
    unpaidList.forEach(rec => {
      if (!debtsByPlayer[rec.playerId]) {
        debtsByPlayer[rec.playerId] = { player: rec.player, total: 0, matches: [] };
      }
      debtsByPlayer[rec.playerId].total += rec.amount;
      debtsByPlayer[rec.playerId].matches.push(`ប្រកួតទី #${rec.matchNumber} (${formatDateKh(rec.matchDate)})`);
    });

    Object.values(debtsByPlayer).forEach(d => {
      msg += `👤 #${d.player?.number || ''} ${d.player?.name || 'កីឡាករ'} (${d.player?.code || ''}):\n`;
      msg += `   ជំពាក់: ${formatCurrency(d.total, settings.currency)} (${d.matches.join(', ')})\n`;
    });

    msg += `\n🙏 សូមបងប្អូនកីឡាករដែលមិនទាន់បានបង់ មេត្តាជួយទូទាត់ចូលមូលនិធិក្រុមផង។ អរគុណច្រើន!`;

    navigator.clipboard.writeText(msg);
    setCopiedDebtText(true);
    setTimeout(() => setCopiedDebtText(false), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* Total Collected */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">ចំណូលពីកីឡាករបង់សរុប</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-black text-emerald-400 mt-2">
            {formatCurrency(grandTotalIncome, settings.currency)}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">
            ប្រមូលបានពីកីឡាករគ្រប់ការប្រកួត
          </p>
        </div>

        {/* Total Pitch & Expenses */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">ចំណាយថ្លៃតារាង & ទឹកសរុប</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-black text-rose-400 mt-2">
            {formatCurrency(grandTotalExpenses, settings.currency)}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">
            ថ្លៃជួលតារាង ទឹកសុទ្ធ និងអាជ្ញាកណ្តាល
          </p>
        </div>

        {/* Net Treasury */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">សមតុល្យមូលនិធិក្រុមសរុប</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${netTreasury >= 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-rose-500/20 text-rose-400'}`}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <h3 className={`text-xl font-black mt-2 ${netTreasury >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
            {netTreasury >= 0 ? '+' : ''}{formatCurrency(netTreasury, settings.currency)}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">
            {netTreasury >= 0 ? '🟢 មូលនិធិមានសល់ទឹកប្រាក់' : '🔴 មូលនិធិកំពុងខ្វះទឹកប្រាក់'}
          </p>
        </div>

        {/* Total Fee Exemptions */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">លើកលែងការបង់សរុប</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm">
              🎁
            </div>
          </div>
          <h3 className="text-xl font-black text-purple-300 mt-2">
            {grandTotalExemptionsCount} <span className="text-xs font-normal text-slate-400">ករណី</span>
          </h3>
          <p className="text-[11px] text-purple-400/80 mt-1">
            អ្នកចាំទី & លើកទឹកចិត្ត/ស្នើសុំ
          </p>
        </div>

        {/* Outstanding Unpaid Debts */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">ប្រាក់ជំពាក់មិនទាន់បង់</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-black text-amber-400 mt-2">
            {formatCurrency(grandTotalPending, settings.currency)}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">
            {unpaidList.length} ករណីកីឡាករមិនទាន់បង់
          </p>
        </div>

      </div>

      {/* Expense Categories Breakdown Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <PieChart className="w-4 h-4 text-rose-400" />
          ការបែងចែកចំណាយតាមផ្នែក (Expense Categories Breakdown)
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">ថ្លៃជួលតារាងបាល់</span>
            <span className="text-sm font-bold text-white mt-0.5 block">
              {formatCurrency(expenseByCategory.pitch || 0, settings.currency)}
            </span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">ថ្លៃទឹកសុទ្ធ & ភេសជ្ជៈ</span>
            <span className="text-sm font-bold text-white mt-0.5 block">
              {formatCurrency(expenseByCategory.water || 0, settings.currency)}
            </span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">ថ្លៃអាជ្ញាកណ្តាល</span>
            <span className="text-sm font-bold text-white mt-0.5 block">
              {formatCurrency(expenseByCategory.referee || 0, settings.currency)}
            </span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">ថ្នាំសង្គ្រោះ & ផ្សេងៗ</span>
            <span className="text-sm font-bold text-white mt-0.5 block">
              {formatCurrency((expenseByCategory.firstaid || 0) + (expenseByCategory.other || 0), settings.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Unpaid Debt Tracker (Very Important for Sunday League football!) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              បញ្ជីកីឡាករមិនទាន់បង់ប្រាក់ថ្លៃតារាង ({unpaidList.length} ករណី)
            </h4>
            <p className="text-xs text-slate-400">តាមដាន និងទូទាត់ប្រាក់ជំពាក់មួយប្រកួតម្តង</p>
          </div>

          {unpaidList.length > 0 && (
            <button
              onClick={handleCopyDebtReminder}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
            >
              {copiedDebtText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedDebtText ? 'បានចម្លងរួចរាល់!' : 'ចម្លងសាររំលឹកចូល Telegram'}</span>
            </button>
          )}
        </div>

        {unpaidList.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <h5 className="text-sm font-bold text-slate-200">គ្មានកីឡាករជំពាក់ប្រាក់ឡើយ!</h5>
            <p className="text-xs text-slate-500 mt-0.5">កីឡាករទាំងអស់បានបង់ថ្លៃតារាងរួចរាល់គ្រប់ៗគ្នា។</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80 max-h-80 overflow-y-auto">
            {unpaidList.map((rec, idx) => (
              <div key={`${rec.matchId}-${rec.playerId}-${idx}`} className="p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={rec.player?.photo}
                    alt={rec.player?.name}
                    className="w-10 h-10 rounded-xl object-cover border border-slate-700 bg-slate-800 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-blue-400">{rec.player?.code}</span>
                      <span className="text-sm font-bold text-white truncate">
                        #{rec.player?.number} {rec.player?.name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      ប្រកួតទី #{rec.matchNumber} ({rec.opponentName}) • {formatDateKh(rec.matchDate)}
                    </p>
                    {rec.note && <p className="text-[11px] text-amber-400 italic mt-0.5">{rec.note}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-black text-rose-400 font-mono">
                    {formatCurrency(rec.amount, settings.currency)}
                  </span>

                  <button
                    onClick={() => handleSettleDebt(rec)}
                    className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                    title="សម្គាល់ថាបានបង់ប្រាក់រួច"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">សម្គាល់ថាបានបង់</span>
                    <span className="sm:hidden">បង់រួច</span>
                  </button>

                  <button
                    onClick={() => handleExemptDebt(rec, 'លើកលែងមិនបង់ប្រាក់ (លើកទឹកចិត្ត/ស្នើសុំ)')}
                    className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                    title="លើកលែងការបង់ថ្លៃប្រកួតនេះ (លើកទឹកចិត្ត/ស្នើសុំ)"
                  >
                    <span>🎁 លើកលែង</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Match-by-Match Financial Statement Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-400" />
              តារាងចំណូល-ចំណាយតាមការប្រកួតនីមួយៗ (Per-Match Financial Statement)
            </h4>
            <p className="text-xs text-slate-400">ពិនិត្យចំណូលពីកីឡាករ និងថ្លៃជួលតារាង</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">ការប្រកួត & កាលបរិច្ឆេទ</th>
                <th className="py-3 px-4">ទីលាន / តារាងបាល់</th>
                <th className="py-3 px-4 text-right">ថ្លៃបង់ម្នាក់ៗ</th>
                <th className="py-3 px-4 text-right">ចំណូលប្រមូលបាន</th>
                <th className="py-3 px-4 text-right">ចំណាយថ្លៃតារាង</th>
                <th className="py-3 px-4 text-right">សមតុល្យ (សល់/ខ្វះ)</th>
                <th className="py-3 px-4 text-center">សកម្មភាព</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {matches.map(m => {
                const fin = calculateMatchFinance(m, playerMap);
                return (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span className="text-blue-400 font-mono">#{m.matchNumber}</span>
                        <span>vs {m.opponentName}</span>
                      </div>
                      <span className="text-[11px] text-slate-500">{formatDateKh(m.date)}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-white block font-medium truncate max-w-xs">{m.stadium}</span>
                      {m.pitchNumber && <span className="text-[11px] text-slate-500">{m.pitchNumber}</span>}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-semibold">
                      {formatCurrency(m.feePerPlayer, settings.currency)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className="font-mono font-bold text-emerald-400 block">
                        {formatCurrency(fin.totalCollected, settings.currency)}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {fin.paidCount}/{fin.squadCount} នាក់
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-400">
                      {formatCurrency(fin.totalExpense, settings.currency)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className={`font-mono font-bold block ${fin.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {fin.netBalance >= 0 ? '+' : ''}{formatCurrency(fin.netBalance, settings.currency)}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {fin.netBalance >= 0 ? 'សល់' : 'ខ្វះ'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => onSelectMatch(m)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        គ្រប់គ្រង
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
