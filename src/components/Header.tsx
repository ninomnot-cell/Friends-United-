import React, { useState, useRef } from 'react';
import { ClubSettings, Match, Player } from '../types';
import { formatCurrency, compressAndResizeImage } from '../utils/formatters';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Wallet, 
  Settings as SettingsIcon, 
  Download, 
  Upload, 
  RotateCcw,
  PlusCircle,
  Sparkles,
  FileSpreadsheet,
  Camera,
  Image as ImageIcon
} from 'lucide-react';

interface HeaderProps {
  settings: ClubSettings;
  onUpdateSettings: (settings: ClubSettings) => void;
  players: Player[];
  matches: Match[];
  onOpenNewPlayer: () => void;
  onOpenNewMatch: () => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetData: () => void;
  onOpenGoogleSheets: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onUpdateSettings,
  players,
  matches,
  onOpenNewPlayer,
  onOpenNewMatch,
  onExportData,
  onImportData,
  onResetData,
  onOpenGoogleSheets,
}) => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [formSettings, setFormSettings] = useState<ClubSettings>(settings);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressAndResizeImage(file, 240);
        if (compressed) {
          setFormSettings(prev => ({ ...prev, clubLogo: compressed }));
        }
      } catch {
        console.error('Error uploading logo image');
      }
    }
    if (e.target) e.target.value = '';
  };

  // Compute club balance
  let totalIncome = 0;
  let totalExpenses = 0;

  matches.forEach(m => {
    (m.squadPlayerIds || []).forEach(pId => {
      if (m.playerFees?.[pId]?.hasPaid) {
        totalIncome += m.playerFees[pId].amount || m.feePerPlayer;
      }
    });
    (m.expenses || []).forEach(exp => {
      totalExpenses += exp.amount || 0;
    });
  });

  const clubBalance = totalIncome - totalExpenses;
  const finishedMatches = matches.filter(m => m.status === 'finished');
  const wins = finishedMatches.filter(m => m.homeScore > m.awayScore).length;
  const draws = finishedMatches.filter(m => m.homeScore === m.awayScore).length;
  const losses = finishedMatches.filter(m => m.homeScore < m.awayScore).length;

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(formSettings);
    setShowSettingsModal(false);
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3.5 gap-4">
          
          {/* Club Branding & Manager Info */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-2xl shadow-lg shadow-blue-900/30 border border-blue-400/30 shrink-0 overflow-hidden">
              {settings.clubLogo && (settings.clubLogo.startsWith('http') || settings.clubLogo.startsWith('data:') || settings.clubLogo.includes('/') || settings.clubLogo.includes('.')) ? (
                <img src={settings.clubLogo} alt={settings.clubName} className="w-full h-full object-cover" />
              ) : (
                <span>{settings.clubLogo || '⚽'}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {settings.clubName}
                </h1>
                <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {settings.clubShortName}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>អ្នកគ្រប់គ្រង៖ <strong className="text-slate-200">{settings.managerName}</strong></span>
                {settings.managerPhone && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span>{settings.managerPhone}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Quick Metrics & Financial Summary */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-between md:justify-end">
            
            {/* Club Treasury / Fund Balance */}
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5 flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${clubBalance >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] block text-slate-400 font-medium">មូលនិធិក្រុម (សមតុល្យ)</span>
                <span className={`text-sm font-bold ${clubBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {clubBalance >= 0 ? '+' : ''}{formatCurrency(clubBalance, settings.currency)}
                </span>
              </div>
            </div>

            {/* Total Active Players */}
            <div className="hidden sm:flex bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5 items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] block text-slate-400 font-medium">កីឡាករ</span>
                <span className="text-sm font-bold text-white">{players.length} នាក់</span>
              </div>
            </div>

            {/* Match Win-Draw-Loss Record */}
            <div className="hidden md:flex bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5 items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] block text-slate-400 font-medium">ស្ថិតិប្រកួត (W-D-L)</span>
                <span className="text-sm font-bold text-white">
                  <span className="text-emerald-400">{wins}ឈ្នះ</span> - <span className="text-amber-400">{draws}ស្មើ</span> - <span className="text-rose-400">{losses}ចាញ់</span>
                </span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={onOpenNewMatch}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                title="បង្កើតកាលវិភាគប្រកួតថ្មី"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">កាលវិភាគថ្មី</span>
                <span className="sm:hidden">+ប្រកួត</span>
              </button>

              <button
                onClick={onOpenNewPlayer}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                title="ចុះឈ្មោះកីឡាករថ្មី"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ចុះឈ្មោះកីឡាករ</span>
                <span className="sm:hidden">+កីឡាករ</span>
              </button>

              {/* Google Sheets Sync Button */}
              <button
                onClick={onOpenGoogleSheets}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                title="ភ្ជាប់ទិន្នន័យទៅកាន់ Google Sheets"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">Google Sheets</span>
              </button>

              {/* Currency switch */}
              <button
                onClick={() => onUpdateSettings({ ...settings, currency: settings.currency === 'KHR' ? 'USD' : 'KHR' })}
                className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                title="ប្តូររូបិយប័ណ្ណ (KHR / USD)"
              >
                {settings.currency === 'KHR' ? '៛ KHR' : '$ USD'}
              </button>

              {/* Settings modal trigger */}
              <button
                onClick={() => {
                  setFormSettings(settings);
                  setShowSettingsModal(true);
                }}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 rounded-lg transition-colors cursor-pointer"
                title="ការកំណត់ក្រុម & ទិន្នន័យ"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-blue-400" />
                ការកំណត់ក្រុមកីឡាបាល់ទាត់
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="p-6 space-y-4">
              {/* Club Logo Customization */}
              <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-2">
                <label className="block text-xs font-semibold text-slate-200">
                  Logo ក្រុម (Club Logo Image & Emoji)
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden text-2xl shadow-inner">
                    {formSettings.clubLogo && (formSettings.clubLogo.startsWith('http') || formSettings.clubLogo.startsWith('data:') || formSettings.clubLogo.includes('/') || formSettings.clubLogo.includes('.')) ? (
                      <img src={formSettings.clubLogo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <span>{formSettings.clubLogo || '⚽'}</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formSettings.clubLogo}
                        onChange={e => setFormSettings({ ...formSettings, clubLogo: e.target.value })}
                        placeholder="Link រូបភាព ឬ Emoji..."
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      >
                        <Camera className="w-3.5 h-3.5 text-white" />
                        <span>ឡើងរូប Logo</span>
                      </button>
                      <input
                        type="file"
                        ref={logoInputRef}
                        accept="image/*"
                        onChange={handleLogoFileUpload}
                        className="hidden"
                      />
                    </div>
                    {/* Preset Logo Icons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400">ជ្រើសរើស Emoji លឿន៖</span>
                      {['🛡️', '⚽', '🤝', '🏆', '⚡', '🦅', '🦁', '🔥', '👑'].map(icon => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setFormSettings({ ...formSettings, clubLogo: icon })}
                          className={`w-7 h-7 rounded-md bg-slate-900 border text-sm flex items-center justify-center hover:scale-110 transition-transform cursor-pointer ${formSettings.clubLogo === icon ? 'border-blue-400 bg-blue-950/60 text-white' : 'border-slate-700 text-slate-300'}`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">ឈ្មោះក្រុម (Club Name)</label>
                  <input
                    type="text"
                    value={formSettings.clubName}
                    onChange={e => setFormSettings({ ...formSettings, clubName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">ឈ្មោះកាត់ (Short Name)</label>
                  <input
                    type="text"
                    value={formSettings.clubShortName}
                    onChange={e => setFormSettings({ ...formSettings, clubShortName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">ឈ្មោះគ្រូបង្វឹក/អ្នកគ្រប់គ្រង</label>
                  <input
                    type="text"
                    value={formSettings.managerName}
                    onChange={e => setFormSettings({ ...formSettings, managerName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">លេខទូរស័ព្ទ / Telegram</label>
                  <input
                    type="text"
                    value={formSettings.managerPhone}
                    onChange={e => setFormSettings({ ...formSettings, managerPhone: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">ថ្លៃបង់ម្នាក់ៗក្នុង 1 ប្រកួត (លំនាំដើម)</label>
                  <input
                    type="number"
                    value={formSettings.defaultFeePerPlayer}
                    onChange={e => setFormSettings({ ...formSettings, defaultFeePerPlayer: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    step={formSettings.currency === 'KHR' ? 1000 : 0.5}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">ថ្លៃជួលតារាងក្នុង 1 ប្រកួត (លំនាំដើម)</label>
                  <input
                    type="number"
                    value={formSettings.defaultPitchCost}
                    onChange={e => setFormSettings({ ...formSettings, defaultPitchCost: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    step={formSettings.currency === 'KHR' ? 5000 : 1}
                  />
                </div>
              </div>

              {/* Discipline Rule: Absence limit for dismissal */}
              <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-xl">
                <label className="block text-xs font-semibold text-rose-300 mb-1">
                  វិន័យក្រុម៖ ចំនួនប្រកួតអវត្តមានជាប់ៗគ្នាសម្រាប់ដកចេញពីក្រុម
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={formSettings.absenceThresholdForDismissal ?? 6}
                    onChange={e => setFormSettings({ ...formSettings, absenceThresholdForDismissal: Math.max(1, Number(e.target.value)) })}
                    className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-rose-500"
                  />
                  <span className="text-xs text-slate-400">
                    ប្រកួតជាប់ៗគ្នា (កីឡាករអវត្តមាន ៦ ប្រកួតជាប់ៗគ្នា ទើបត្រូវដកចេញពីក្រុម)
                  </span>
                </div>
              </div>

              {/* Data Backup & Restore */}
              <div className="pt-4 border-t border-slate-800">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  ការរក្សាទុកទិន្នន័យ & បម្រុងទុក (Backup & Export)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={onExportData}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    ទាញយក JSON
                  </button>

                  <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    បញ្ចូល JSON
                    <input
                      type="file"
                      accept=".json"
                      onChange={onImportData}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('តើអ្នកពិតជាចង់កំណត់ទិន្នន័យគំរូលំនាំដើមឡើងវិញមែនទេ?')) {
                        onResetData();
                        setShowSettingsModal(false);
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/50 rounded-lg text-xs font-medium transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                    កំណត់ឡើងវិញ
                  </button>
                </div>

                {/* Google Sheets direct action in settings */}
                <div className="mt-3 p-3 bg-slate-950 rounded-xl border border-emerald-500/30 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Google Sheets Sync</span>
                      <span className="text-[11px] text-slate-400">ធ្វើសមកាលកម្មកីឡាករ កាលវិភាគ និងហិរញ្ញវត្ថុ</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSettingsModal(false);
                      onOpenGoogleSheets();
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    គ្រប់គ្រង Sheets
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  រក្សាទុកការកែប្រែ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
