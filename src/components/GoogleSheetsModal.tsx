import React, { useState, useEffect } from 'react';
import { ClubSettings, Match, Player } from '../types';
import {
  GoogleSheetSyncConfig,
  getSavedSyncConfig,
  saveSyncConfig,
  isGoogleAuthenticated,
  disconnectGoogle,
  requestGoogleAccessToken,
  createClubSpreadsheet,
  syncAllDataToSpreadsheet,
  extractSpreadsheetId,
  getSpreadsheetDetails,
} from '../services/googleSheets';
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  PlusCircle,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Sparkles,
  Layers,
  Database,
  Calendar,
  Users,
  Wallet,
  X
} from 'lucide-react';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ClubSettings;
  players: Player[];
  matches: Match[];
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  settings,
  players,
  matches,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(isGoogleAuthenticated());
  const [syncConfig, setSyncConfig] = useState<GoogleSheetSyncConfig | null>(getSavedSyncConfig());
  const [activeTab, setActiveTab] = useState<'create' | 'link'>('create');
  const [existingInput, setExistingInput] = useState<string>('');
  const [newSheetTitle, setNewSheetTitle] = useState<string>(`${settings.clubName} - ទិន្នន័យ & ហិរញ្ញវត្ថុ`);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setIsAuthenticated(isGoogleAuthenticated());
    setSyncConfig(getSavedSyncConfig());
    setNewSheetTitle(`${settings.clubName} - ទិន្នន័យ & ហិរញ្ញវត្ថុ`);
  }, [isOpen, settings.clubName]);

  if (!isOpen) return null;

  // Sign In with Google
  const handleConnectGoogle = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      await requestGoogleAccessToken(true);
      setIsAuthenticated(true);
      setStatusMessage({
        type: 'success',
        text: 'បានភ្ជាប់គណនី Google ដោយជោគជ័យ!',
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'មិនអាចភ្ជាប់គណនី Google បានទេ',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect Google
  const handleDisconnectGoogle = () => {
    disconnectGoogle();
    setIsAuthenticated(false);
    setStatusMessage({
      type: 'success',
      text: 'បានផ្តាច់ការភ្ជាប់ Google រួចរាល់។',
    });
  };

  // 1-Click Create New Spreadsheet
  const handleCreateNewSheet = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      let token = await requestGoogleAccessToken(false).catch(() => null);
      if (!token) {
        token = await requestGoogleAccessToken(true);
      }

      const config = await createClubSpreadsheet(
        token,
        newSheetTitle,
        settings,
        players,
        matches
      );

      setSyncConfig(config);
      setIsAuthenticated(true);
      setStatusMessage({
        type: 'success',
        text: `បានបង្កើត Google Sheet «${config.spreadsheetTitle}» និងបញ្ចូលទិន្នន័យទាំងអស់រួចរាល់!`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'បរាជ័យក្នុងការបង្កើត Google Sheet',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Link Existing Spreadsheet
  const handleLinkExistingSheet = async () => {
    const rawId = extractSpreadsheetId(existingInput);
    if (!rawId) {
      setStatusMessage({
        type: 'error',
        text: 'សូមបញ្ចូល Google Sheet ID ឬ Link ឱ្យបានត្រឹមត្រូវ',
      });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);
    try {
      let token = await requestGoogleAccessToken(false).catch(() => null);
      if (!token) {
        token = await requestGoogleAccessToken(true);
      }

      const details = await getSpreadsheetDetails(token, rawId);
      const title = details.properties?.title || 'Google Sheet របស់ក្រុម';
      const url = `https://docs.google.com/spreadsheets/d/${rawId}/edit`;

      // Sync data to it
      await syncAllDataToSpreadsheet(token, rawId, settings, players, matches);

      const config: GoogleSheetSyncConfig = {
        spreadsheetId: rawId,
        spreadsheetTitle: title,
        spreadsheetUrl: url,
        lastSyncedAt: new Date().toISOString(),
        autoSync: true,
      };

      saveSyncConfig(config);
      setSyncConfig(config);
      setIsAuthenticated(true);
      setStatusMessage({
        type: 'success',
        text: `បានភ្ជាប់ជាមួយ «${title}» និងសមកាលកម្មទិន្នន័យរួចរាល់!`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'មិនអាចភ្ជាប់ Google Sheet នេះបានទេ',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger manual sync
  const handleSyncNow = async () => {
    if (!syncConfig?.spreadsheetId) return;

    setIsLoading(true);
    setStatusMessage(null);
    try {
      let token = await requestGoogleAccessToken(false).catch(() => null);
      if (!token) {
        token = await requestGoogleAccessToken(true);
      }

      const result = await syncAllDataToSpreadsheet(
        token,
        syncConfig.spreadsheetId,
        settings,
        players,
        matches
      );

      setSyncConfig({
        ...syncConfig,
        lastSyncedAt: new Date().toISOString(),
      });
      setIsAuthenticated(true);
      setStatusMessage({
        type: 'success',
        text: result.message,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'បរាជ័យក្នុងការធ្វើសមកាលកម្មទិន្នន័យ',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Remove current spreadsheet connection
  const handleUnlinkSpreadsheet = () => {
    if (confirm('តើអ្នកពិតជាចង់ផ្តាច់ Google Sheet នេះមែនទេ? (ទិន្នន័យនៅក្នុង Google Sheet មិនត្រូវបានលុបឡើយ)')) {
      saveSyncConfig(null);
      setSyncConfig(null);
      setStatusMessage({
        type: 'success',
        text: 'បានផ្តាច់ Google Sheet ចេញពីកម្មវិធី។',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>ភ្ជាប់ទិន្នន័យទៅកាន់ Google Sheets</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  Google Workspace
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                ធ្វើសមកាលកម្មទិន្នន័យកីឡាករ កាលវិភាគប្រកួត វត្តមាន និងហិរញ្ញវត្ថុស្វ័យប្រវត្ត
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Status Alert */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in duration-150 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/60 border border-emerald-700/60 text-emerald-200'
                  : 'bg-rose-950/60 border border-rose-700/60 text-rose-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span className="flex-1 font-medium">{statusMessage.text}</span>
            </div>
          )}

          {/* Google Account Authentication Status Card */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isAuthenticated ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-600'}`} />
              <div>
                <span className="text-xs font-semibold text-slate-300 block">
                  ស្ថានភាពគណនី Google (Google Account)
                </span>
                <span className="text-xs text-slate-400">
                  {isAuthenticated
                    ? '✓ បានភ្ជាប់រួចរាល់ (Active Session)'
                    : 'មិនទាន់បានភ្ជាប់ ឬផុតកំណត់ Session'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {!isAuthenticated ? (
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  disabled={isLoading}
                  className="w-full sm:w-auto px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ចូលគណនី Google (Sign in)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDisconnectGoogle}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>ផ្តាច់ការភ្ជាប់</span>
                </button>
              )}
            </div>
          </div>

          {/* Active Connected Spreadsheet Section */}
          {syncConfig ? (
            <div className="bg-gradient-to-b from-slate-950 to-slate-900/80 p-5 rounded-xl border-2 border-emerald-600/40 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                    Google Sheet ដែលកំពុងភ្ជាប់ (Connected Sheet)
                  </span>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>{syncConfig.spreadsheetTitle}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    ID: <code className="text-slate-300 font-mono text-[11px] bg-slate-900 px-1.5 py-0.5 rounded">{syncConfig.spreadsheetId}</code>
                  </p>
                  {syncConfig.lastSyncedAt && (
                    <p className="text-[11px] text-slate-400 pt-1">
                      សមកាលកម្មចុងក្រោយ៖{' '}
                      <strong className="text-slate-200">
                        {new Date(syncConfig.lastSyncedAt).toLocaleString('km-KH')}
                      </strong>
                    </p>
                  )}
                </div>

                <a
                  href={syncConfig.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <span>បើកមើលក្នុង Sheet</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Action Buttons for Connected Sheet */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={isLoading}
                  className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>{isLoading ? 'កំពុងសមកាលកម្ម...' : 'ធ្វើសមកាលកម្មទិន្នន័យឥឡូវនេះ (Sync Now)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleUnlinkSpreadsheet}
                  className="text-xs text-rose-400 hover:text-rose-300 underline cursor-pointer"
                >
                  ផ្តាច់ Sheet នេះចេញ
                </button>
              </div>
            </div>
          ) : (
            /* Setup New Connection (Tabbed: Create vs Link) */
            <div className="space-y-4">
              <div className="flex border-b border-slate-800">
                <button
                  onClick={() => setActiveTab('create')}
                  className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'create'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>បង្កើត Google Sheet ថ្មី (1-Click)</span>
                </button>
                <button
                  onClick={() => setActiveTab('link')}
                  className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'link'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>ភ្ជាប់ Sheet ដែលមានស្រាប់ (Link Existing)</span>
                </button>
              </div>

              {activeTab === 'create' ? (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      ចំណងជើង Google Sheet ថ្មី
                    </label>
                    <input
                      type="text"
                      value={newSheetTitle}
                      onChange={e => setNewSheetTitle(e.target.value)}
                      placeholder="Friends United FT - ទិន្នន័យ & ហិរញ្ញវត្ថុ"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <p className="text-xs text-slate-400">
                    ប្រព័ន្ធនឹងបង្កើត Google Spreadsheet ថ្មីនៅលើ Google Drive របស់អ្នក ដោយបែងចែកជា ៤ សន្លឹកកិច្ចការ (Sheets) ដោយស្វ័យប្រវត្ត៖
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800">
                      <Users className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                      <span className="font-semibold text-white block text-[11px]">បញ្ជីកីឡាករ</span>
                      <span className="text-[10px] text-slate-400">{players.length} នាក់</span>
                    </div>
                    <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800">
                      <Calendar className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                      <span className="font-semibold text-white block text-[11px]">កាលវិភាគប្រកួត</span>
                      <span className="text-[10px] text-slate-400">{matches.length} ប្រកួត</span>
                    </div>
                    <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800">
                      <Layers className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                      <span className="font-semibold text-white block text-[11px]">វត្តមាន & បង់លុយ</span>
                      <span className="text-[10px] text-slate-400">តាមប្រកួតនីមួយៗ</span>
                    </div>
                    <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800">
                      <Wallet className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                      <span className="font-semibold text-white block text-[11px]">របាយការណ៍ហិរញ្ញវត្ថុ</span>
                      <span className="text-[10px] text-slate-400">ចំណូល ចំណាយ</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateNewSheet}
                    disabled={isLoading || !newSheetTitle.trim()}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>{isLoading ? 'កំពុងបង្កើត Google Sheet...' : 'បង្កើត Google Sheet & បញ្ចូលទិន្នន័យឥឡូវនេះ'}</span>
                  </button>
                </div>
              ) : (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      បញ្ចូល Google Spreadsheet ID ឬ Link
                    </label>
                    <input
                      type="text"
                      value={existingInput}
                      onChange={e => setExistingInput(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      អ្នកអាចចម្លងតំណភ្ជាប់ (URL) ពី Browser របស់អ្នក ហើយបិទភ្ជាប់នៅទីនេះ។
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleLinkExistingSheet}
                    disabled={isLoading || !existingInput.trim()}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <LinkIcon className="w-4 h-4" />
                    <span>{isLoading ? 'កំពុងភ្ជាប់ & សមកាលកម្ម...' : 'ភ្ជាប់ Google Sheet & ធ្វើសមកាលកម្ម'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Sync Structure Guide Card */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-2 text-xs text-slate-300">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span>ព័ត៌មានដែលនឹងត្រូវ Sync ទៅ Google Sheets៖</span>
            </span>
            <ul className="list-disc list-inside text-slate-400 space-y-1 text-[11px]">
              <li><strong>កីឡាករ៖</strong> លេខកូដ, ឈ្មោះ, តួនាទី, លេខទូរស័ព្ទ, ស្ថានភាព (សកម្ម/ដកចេញ), វត្តមាន, គ្រាប់បាល់, បញ្ជូន</li>
              <li><strong>ការប្រកួត៖</strong> កាលបរិច្ឆេទ, គូប្រកួត, ទីលាន, លទ្ធផល, ចំណូលកីឡាករបង់, ថ្លៃតារាង, ចំណាយទឹកសុទ្ធ</li>
              <li><strong>វត្តមាន & ការបង់ប្រាក់៖</strong> បញ្ជីកីឡាករដែលចូលរួម និងអ្នកអវត្តមានព្រមទាំងស្ថានភាពបង់ប្រាក់រាល់ការប្រកួត</li>
              <li><strong>ហិរញ្ញវត្ថុ៖</strong> សមតុល្យសរុបមូលនិធិក្រុម ថ្លៃតារាង និងចំណាយផ្សេងៗ</li>
            </ul>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Google Sheets API v4 • Google Drive File Scope
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            បិទ
          </button>
        </div>

      </div>
    </div>
  );
};
