import React, { useState } from 'react';
import { Match, Player, ClubSettings } from '../types';
import { formatDateKh, formatCurrency, getMatchVoteAnalysis, generateTelegramVotePollText } from '../utils/formatters';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  Send, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Download
} from 'lucide-react';

interface MatchShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
  players: Player[];
  settings: ClubSettings;
}

export const MatchShareModal: React.FC<MatchShareModalProps> = ({
  isOpen,
  onClose,
  match,
  players,
  settings,
}) => {
  const [copiedText, setCopiedText] = useState(false);
  const [shareMode, setShareMode] = useState<'poster' | 'text'>('poster');

  if (!isOpen) return null;

  const analysis = getMatchVoteAnalysis(match, players);
  const shareText = generateTelegramVotePollText(match, players, settings.clubName);
  const shareUrl = window.location.href;

  const handleCopyText = () => {
    navigator.clipboard.writeText(shareText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `⚽ Match Day: ${settings.clubName} vs ${match.opponentName}`,
          text: shareText,
          url: shareUrl,
        });
      } catch {
        handleCopyText();
      }
    } else {
      handleCopyText();
    }
  };

  const handleShareTelegram = () => {
    const encoded = encodeURIComponent(shareText);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encoded}`, '_blank');
  };

  const handleShareWhatsApp = () => {
    const encoded = encodeURIComponent(shareText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleShareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl my-6 overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                ចែករំលែកការប្រកួត (Share Match Day)
              </h3>
              <p className="text-xs text-slate-400">ចែករំលែកទៅកាន់បណ្តាញសង្គម ឬឧបករណ៍ផ្សេងៗ</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div className="px-5 pt-4 flex items-center gap-2">
          <button
            onClick={() => setShareMode('poster')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              shareMode === 'poster'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            🖼️ ផ្ទាំងរូបភាពប្រកួត (Match Poster Card)
          </button>
          <button
            onClick={() => setShareMode('text')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              shareMode === 'text'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            📝 សារអត្ថបទ Vote & ព័ត៌មាន (Text Message)
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[68vh] overflow-y-auto">
          
          {shareMode === 'poster' ? (
            /* Digital Match Poster Card */
            <div className="relative rounded-2xl overflow-hidden border-2 border-blue-500/40 bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/90 shadow-2xl p-5 sm:p-6 text-center space-y-5">
              <div className="absolute top-0 right-0 w-44 h-44 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

              {/* Tag / Format */}
              <div className="flex items-center justify-between text-xs">
                <span className="px-3 py-1 rounded-full bg-blue-900/60 text-blue-300 font-bold border border-blue-700/50 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  MATCH DAY #{match.matchNumber}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 font-semibold font-mono text-[11px]">
                  ទម្រង់ {match.format}
                </span>
              </div>

              {/* Clubs Head-to-Head */}
              <div className="flex items-center justify-around gap-2 py-3">
                {/* Home */}
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-900 border-2 border-blue-500/50 flex items-center justify-center text-3xl shadow-lg shrink-0 overflow-hidden">
                    {settings.clubLogo && (settings.clubLogo.startsWith('http') || settings.clubLogo.startsWith('data:') || settings.clubLogo.includes('/') || settings.clubLogo.includes('.')) ? (
                      <img src={settings.clubLogo} alt={settings.clubName} className="w-full h-full object-cover" />
                    ) : (
                      <span>{settings.clubLogo || '⚽'}</span>
                    )}
                  </div>
                  <h4 className="text-base font-black text-white mt-2 truncate max-w-[140px]">{settings.clubName}</h4>
                  <span className="text-[11px] text-blue-400 font-bold">ម្ចាស់ផ្ទះ</span>
                </div>

                {/* VS Badge */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center font-black text-xs text-white shadow-md shadow-blue-950 shrink-0">
                  VS
                </div>

                {/* Away */}
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl bg-rose-600/20 border-2 border-rose-500/50 flex items-center justify-center text-3xl shadow-lg">
                    {match.opponentLogo || '⚡'}
                  </div>
                  <h4 className="text-base font-black text-slate-200 mt-2 truncate max-w-[140px]">{match.opponentName}</h4>
                  <span className="text-[11px] text-rose-400 font-bold">គូប្រកួត</span>
                </div>
              </div>

              {/* Date, Time, Stadium Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
                <div className="flex items-center gap-2 text-left">
                  <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">កាលបរិច្ឆេទ</span>
                    <span className="font-bold text-white">{formatDateKh(match.date)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-left">
                  <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">ម៉ោងប្រកួត</span>
                    <span className="font-bold text-white">{match.time}</span>
                  </div>
                </div>

                <div className="col-span-2 flex items-center gap-2 text-left pt-2 border-t border-slate-800/60">
                  <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                  <div className="truncate">
                    <span className="text-[10px] text-slate-400 block font-medium">ទីលាន / តារាងបាល់</span>
                    <span className="font-bold text-white truncate block">{match.stadium} {match.pitchNumber ? `(${match.pitchNumber})` : ''}</span>
                  </div>
                </div>
              </div>

              {/* GK Free Badge & Fee Info */}
              <div className="flex items-center justify-between text-xs bg-emerald-950/30 border border-emerald-500/30 p-2.5 rounded-xl flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🧤</span>
                  <div className="text-left">
                    <span className="font-bold text-emerald-300 block text-[11px]">អ្នកចាំទី (GK) មិនតម្រូវឱ្យបង់ប្រាក់ថ្លៃតារាងឡើយ</span>
                    <span className="text-[10px] text-slate-400">កីឡាករអាចបង់ស្ម័គ្រចិត្តបាន</span>
                  </div>
                </div>
                <div className="text-right ml-auto">
                  <span className="text-[10px] text-slate-400 block">ថ្លៃបង់ម្នាក់ៗ</span>
                  <span className="font-mono font-bold text-white text-xs">{formatCurrency(match.feePerPlayer, settings.currency)}</span>
                </div>
              </div>

              {/* Pre-Match RSVP Status summary */}
              <div className="flex items-center justify-around text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <div className="text-center">
                  <span className="text-[10px] text-slate-400 block">✅ Vote ទៅ</span>
                  <span className="font-bold text-emerald-400 text-sm">{analysis.votedYesCount} នាក់</span>
                </div>
                <div className="h-6 w-px bg-slate-800"></div>
                <div className="text-center">
                  <span className="text-[10px] text-slate-400 block">❌ Vote អត់ទៅ</span>
                  <span className="font-bold text-rose-400 text-sm">{analysis.votedNoCount} នាក់</span>
                </div>
                <div className="h-6 w-px bg-slate-800"></div>
                <div className="text-center">
                  <span className="text-[10px] text-slate-400 block">❓ មិនទាន់ Vote</span>
                  <span className="font-bold text-amber-400 text-sm">{analysis.notVotedCount} នាក់</span>
                </div>
              </div>

            </div>
          ) : (
            /* Plain Text Box for Copying */
            <div className="space-y-2">
              <textarea
                readOnly
                rows={11}
                value={shareText}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none"
              />
            </div>
          )}

          {/* Social Share Action Buttons */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-bold text-slate-300 block">ចែករំលែកទៅកាន់៖</span>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Telegram */}
              <button
                onClick={handleShareTelegram}
                className="flex items-center justify-center gap-1.5 p-2.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Telegram</span>
              </button>

              {/* WhatsApp */}
              <button
                onClick={handleShareWhatsApp}
                className="flex items-center justify-center gap-1.5 p-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>

              {/* Facebook */}
              <button
                onClick={handleShareFacebook}
                className="flex items-center justify-center gap-1.5 p-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Facebook</span>
              </button>

              {/* Native Device Share (iOS / Android / Other device) */}
              <button
                onClick={handleNativeShare}
                className="flex items-center justify-center gap-1.5 p-2.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="ចែករំលែកទៅកាន់កម្មវិធីផ្សេងៗលើទូរស័ព្ទ / Device"
              >
                <Share2 className="w-4 h-4" />
                <span>Other Device</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400 truncate">
            {copiedText ? '✅ បានចម្លងអត្ថបទរួចរាល់!' : 'ចុច Copy ដើម្បីបិទភ្ជាប់ក្នុងគ្រុប'}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedText ? 'បានចម្លង!' : 'ចម្លងអត្ថបទ'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              រួចរាល់
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
