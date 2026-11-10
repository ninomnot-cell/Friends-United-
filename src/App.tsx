import React, { useState, useEffect } from 'react';
import { ClubSettings, Match, Player } from './types';
import { initialClubSettings, initialPlayers, initialMatches } from './data/initialData';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { PlayerManagement } from './components/PlayerManagement';
import { MatchScheduler } from './components/MatchScheduler';
import { FinanceView } from './components/FinanceView';
import { StatsView } from './components/StatsView';
import { MatchDetailModal } from './components/MatchDetailModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { 
  useFirestoreSync, 
  saveClubSettingsToFirestore, 
  savePlayerToFirestore, 
  deletePlayerFromFirestore, 
  saveMatchToFirestore, 
  deleteMatchFromFirestore 
} from './utils/firestoreSync';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Wallet, 
  Trophy,
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  CloudCheck
} from 'lucide-react';

const STORAGE_KEYS = {
  SETTINGS: 'football_club_settings_v1',
  PLAYERS: 'football_club_players_v1',
  MATCHES: 'football_club_matches_v1',
};

export default function App() {
  // Persistence state
  const [settings, setSettings] = useState<ClubSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        const isOldLogo = !parsed.clubLogo || parsed.clubLogo === '🤝' || parsed.clubLogo === '🦁' || parsed.clubLogo === '⚽';
        const result = {
          ...parsed,
          clubName: 'Friends United FT',
          clubShortName: parsed.clubShortName === 'BLFC' ? 'FUFT' : (parsed.clubShortName || 'FUFT'),
          clubLogo: isOldLogo ? initialClubSettings.clubLogo : parsed.clubLogo,
          absenceThresholdForDismissal: parsed.absenceThresholdForDismissal === 4 || !parsed.absenceThresholdForDismissal ? 6 : parsed.absenceThresholdForDismissal,
        };
        return result;
      }
      return initialClubSettings;
    } catch {
      return initialClubSettings;
    }
  });

  const [players, setPlayers] = useState<Player[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PLAYERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
      return initialPlayers;
    } catch {
      return initialPlayers;
    }
  });

  const [matches, setMatches] = useState<Match[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MATCHES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
      return initialMatches;
    } catch {
      return initialMatches;
    }
  });

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'players' | 'matches' | 'finances' | 'stats'>('dashboard');

  // Real-time Firestore Cloud Database Synchronization
  useFirestoreSync(settings, setSettings, players, setPlayers, matches, setMatches);

  // Modals state
  const [isOpenNewPlayerModal, setIsOpenNewPlayerModal] = useState(false);
  const [isOpenNewMatchModal, setIsOpenNewMatchModal] = useState(false);
  const [isOpenGoogleSheetsModal, setIsOpenGoogleSheetsModal] = useState(false);
  const [selectedMatchForDetail, setSelectedMatchForDetail] = useState<Match | null>(null);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Safe localStorage helper for players
  const savePlayersToStorage = (list: Player[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(list));
    } catch (e) {
      console.warn('Direct save to localStorage failed, stripping heavy photos to save data...', e);
      try {
        const lightweight = list.map(p => ({
          ...p,
          photo: p.photo && p.photo.length > 80000 ? '' : p.photo,
        }));
        localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(lightweight));
      } catch (e2) {
        console.error('Failed saving players to localStorage', e2);
      }
    }
  };

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving settings', e);
    }
  }, [settings]);

  useEffect(() => {
    savePlayersToStorage(players);
  }, [players]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(matches));
    } catch (e) {
      console.error('Error saving matches', e);
    }
  }, [matches]);

  // Modal navigation triggers
  const handleOpenNewPlayer = () => {
    setActiveTab('players');
    setIsOpenNewPlayerModal(true);
  };

  const handleOpenNewMatch = () => {
    setActiveTab('matches');
    setIsOpenNewMatchModal(true);
  };

  // Player Handlers
  const handleAddPlayer = (newPlayer: Player) => {
    setPlayers(prev => {
      const next = [newPlayer, ...prev];
      savePlayersToStorage(next);
      return next;
    });
    savePlayerToFirestore(newPlayer);
    showToast(`បានកត់ត្រាទុកកីឡាករ "${newPlayer.name}" (${newPlayer.code}) ដោយជោគជ័យ!`, 'success');
  };

  const handleUpdatePlayer = (updatedPlayer: Player) => {
    setPlayers(prev => {
      const next = prev.map(p => (p.id === updatedPlayer.id ? updatedPlayer : p));
      savePlayersToStorage(next);
      return next;
    });
    savePlayerToFirestore(updatedPlayer);
    showToast(`បានកែសម្រួលព័ត៌មានកីឡាករ "${updatedPlayer.name}" ដោយជោគជ័យ!`, 'success');
  };

  const handleDeletePlayer = (playerId: string) => {
    const deleted = players.find(p => p.id === playerId);
    setPlayers(prev => {
      const next = prev.filter(p => p.id !== playerId);
      savePlayersToStorage(next);
      return next;
    });
    deletePlayerFromFirestore(playerId);
    showToast(`បានលុបកីឡាករ ${deleted ? `"${deleted.name}"` : ''} ចេញពីក្រុមរួចរាល់!`, 'info');
  };

  // Match Handlers
  const handleAddMatch = (newMatch: Match) => {
    setMatches(prev => [newMatch, ...prev]);
    saveMatchToFirestore(newMatch);
  };

  const handleUpdateMatch = (updatedMatch: Match) => {
    setMatches(prev => prev.map(m => (m.id === updatedMatch.id ? updatedMatch : m)));
    if (selectedMatchForDetail && selectedMatchForDetail.id === updatedMatch.id) {
      setSelectedMatchForDetail(updatedMatch);
    }
    saveMatchToFirestore(updatedMatch);
  };

  const handleDeleteMatch = (matchId: string) => {
    setMatches(prev => prev.filter(m => m.id !== matchId));
    if (selectedMatchForDetail?.id === matchId) {
      setSelectedMatchForDetail(null);
    }
    deleteMatchFromFirestore(matchId);
  };

  // Backup Data Export
  const handleExportData = () => {
    const backupData = {
      settings,
      players,
      matches,
      exportDate: new Date().toISOString(),
      version: '1.0',
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${settings.clubShortName || 'football'}-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Backup Data Import
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.settings && Array.isArray(parsed.players) && Array.isArray(parsed.matches)) {
          setSettings(parsed.settings);
          setPlayers(parsed.players);
          setMatches(parsed.matches);
          alert('ទិន្នន័យត្រូវបានបញ្ចូលដោយជោគជ័យ!');
        } else {
          alert('ឯកសារមិនត្រូវទម្រង់ទិន្នន័យត្រឹមត្រូវឡើយ។');
        }
      } catch (err) {
        alert('មានបញ្ហាក្នុងការអានឯកសារ JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Reset to initial sample data
  const handleResetData = () => {
    setSettings(initialClubSettings);
    setPlayers(initialPlayers);
    setMatches(initialMatches);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.PLAYERS);
    localStorage.removeItem(STORAGE_KEYS.MATCHES);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      
      {/* Club Top Header */}
      <Header
        settings={settings}
        onUpdateSettings={newSettings => {
          setSettings(newSettings);
          saveClubSettingsToFirestore(newSettings);
        }}
        players={players}
        matches={matches}
        onOpenNewPlayer={handleOpenNewPlayer}
        onOpenNewMatch={handleOpenNewMatch}
        onExportData={handleExportData}
        onImportData={handleImportData}
        onResetData={handleResetData}
        onOpenGoogleSheets={() => setIsOpenGoogleSheetsModal(true)}
      />

      {/* Main Tab Navigation Bar */}
      <nav className="border-b border-slate-800/80 bg-slate-900/50 sticky top-[69px] z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2.5 scrollbar-none">
            
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>ផ្ទាំងគ្រប់គ្រង (Dashboard)</span>
            </button>

            <button
              onClick={() => setActiveTab('players')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'players'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>កីឡាករ & ចុះឈ្មោះ ({players.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('matches')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'matches'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>កាលវិភាគ & ប្រកួត ({matches.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('finances')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'finances'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>ចំណូល & ថ្លៃតារាង</span>
            </button>

            <button
              onClick={() => setActiveTab('stats')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'stats'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>ស្ថិតិការប្រកួតយ៉ាងលម្អិត</span>
            </button>

            {/* Quick Google Sheets Sync button in nav */}
            <button
              onClick={() => setIsOpenGoogleSheetsModal(true)}
              className="ml-auto hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40"
              title="ភ្ជាប់ Google Sheets & ធ្វើសមកាលកម្មទិន្នន័យ"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Google Sheets</span>
            </button>

          </div>
        </div>
      </nav>

      {/* Main Container Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 w-full">
        {activeTab === 'dashboard' && (
          <DashboardView
            settings={settings}
            players={players}
            matches={matches}
            onOpenNewMatch={handleOpenNewMatch}
            onOpenNewPlayer={handleOpenNewPlayer}
            onSelectMatch={m => setSelectedMatchForDetail(m)}
            onNavigateTab={tab => setActiveTab(tab)}
            onOpenGoogleSheets={() => setIsOpenGoogleSheetsModal(true)}
          />
        )}

        {activeTab === 'players' && (
          <PlayerManagement
            players={players}
            matches={matches}
            currency={settings.currency}
            absenceThreshold={settings.absenceThresholdForDismissal || 6}
            onAddPlayer={handleAddPlayer}
            onUpdatePlayer={handleUpdatePlayer}
            onDeletePlayer={handleDeletePlayer}
            isOpenNewPlayerModal={isOpenNewPlayerModal}
            onCloseNewPlayerModal={() => setIsOpenNewPlayerModal(false)}
          />
        )}

        {activeTab === 'matches' && (
          <MatchScheduler
            matches={matches}
            players={players}
            clubName={settings.clubName}
            currency={settings.currency}
            defaultFeePerPlayer={settings.defaultFeePerPlayer}
            defaultPitchCost={settings.defaultPitchCost}
            onAddMatch={handleAddMatch}
            onUpdateMatch={handleUpdateMatch}
            onDeleteMatch={handleDeleteMatch}
            isOpenNewMatchModal={isOpenNewMatchModal}
            onOpenNewMatchModal={() => setIsOpenNewMatchModal(true)}
            onCloseNewMatchModal={() => setIsOpenNewMatchModal(false)}
          />
        )}

        {activeTab === 'finances' && (
          <FinanceView
            matches={matches}
            players={players}
            settings={settings}
            onUpdateMatch={handleUpdateMatch}
            onSelectMatch={m => setSelectedMatchForDetail(m)}
          />
        )}

        {activeTab === 'stats' && (
          <StatsView
            matches={matches}
            players={players}
          />
        )}
      </main>

      {/* Standalone Match Detail Modal (when selected from Dashboard or Finance view) */}
      {selectedMatchForDetail && (
        <MatchDetailModal
          match={selectedMatchForDetail}
          players={players}
          clubName={settings.clubName}
          currency={settings.currency}
          settings={settings}
          onUpdateMatch={handleUpdateMatch}
          onClose={() => setSelectedMatchForDetail(null)}
        />
      )}

      {/* Google Sheets Integration Modal */}
      <GoogleSheetsModal
        isOpen={isOpenGoogleSheetsModal}
        onClose={() => setIsOpenGoogleSheetsModal(false)}
        settings={settings}
        players={players}
        matches={matches}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in transition-all">
          <div className={`px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-semibold border backdrop-blur-md ${
            toastMessage.type === 'success' 
              ? 'bg-emerald-950/95 text-emerald-200 border-emerald-500/60 shadow-emerald-950/50' 
              : toastMessage.type === 'error'
              ? 'bg-rose-950/95 text-rose-200 border-rose-500/60 shadow-rose-950/50'
              : 'bg-blue-950/95 text-blue-200 border-blue-500/60 shadow-blue-950/50'
          }`}>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{settings.clubName} • ប្រព័ន្ធគ្រប់គ្រងក្រុមកីឡាបាល់ទាត់មិនអាជីព</span>
          <div className="flex items-center gap-3">
            <span>កីឡាករ: {players.length} នាក់</span>
            <span>•</span>
            <span>ប្រកួត: {matches.length} ប្រកួត</span>
            <span>•</span>
            <span className="text-slate-400">គាំទ្រ Telegram Share</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
