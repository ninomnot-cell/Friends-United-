import React, { useState, useRef } from 'react';
import { Match, ClubSettings } from '../types';
import { formatDateKh, formatCurrency } from '../utils/formatters';
import * as htmlToImage from 'html-to-image';
import { 
  X, 
  Download, 
  Sparkles, 
  Share2, 
  Palette, 
  Copy, 
  Check, 
  Calendar, 
  Clock, 
  MapPin, 
  Trophy, 
  ShieldAlert, 
  CheckCircle2,
  Image as ImageIcon,
  Wand2,
  RefreshCcw,
  AlertCircle
} from 'lucide-react';

interface MatchPosterModalProps {
  match: Match;
  clubSettings?: ClubSettings;
  clubLogo?: string;
  clubName?: string;
  currency?: 'KHR' | 'USD';
  onClose: () => void;
}

export const MatchPosterModal: React.FC<MatchPosterModalProps> = ({
  match,
  clubSettings,
  clubLogo = clubSettings?.clubLogo || '⚽',
  clubName = clubSettings?.clubName || 'Friends United FT',
  currency = clubSettings?.currency || 'KHR',
  onClose,
}) => {
  const [posterTheme, setPosterTheme] = useState<'neon' | 'gold' | 'derby' | 'pitch'>('neon');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5'>('1:1');
  const [isExporting, setIsExporting] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  // AI Poster Background Generator States
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiModel, setAiModel] = useState<'gemini-nano-banana-2.1' | 'gemini-3.1-flash-lite-image'>('gemini-3.1-flash-lite-image');
  const [aiBgImage, setAiBgImage] = useState<string | null>(null);
  const [isGeneratingAiBg, setIsGeneratingAiBg] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleGenerateAiBg = async (customPrompt?: string) => {
    const promptToUse = customPrompt || aiPrompt;
    if (!promptToUse.trim()) return;

    setIsGeneratingAiBg(true);
    setAiError(null);

    try {
      const res = await fetch('/api/gemini/generate-poster-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Football match poster background art: ${promptToUse}. High quality 3D render, epic sports stadium atmosphere, cinematic lighting, dark luxury aesthetic.`,
          aspectRatio,
          model: aiModel,
          sourceImageBase64: aiBgImage || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.details || 'មិនអាចបង្កើតរូបភាព AI បានទេ');
      }

      if (data.imageUrl) {
        setAiBgImage(data.imageUrl);
      }
    } catch (err: any) {
      console.error('Error generating AI poster image:', err);
      setAiError(err.message || 'មានបញ្ហាក្នុងការបង្កើតរូបភាពជាមួយ Gemini AI');
    } finally {
      setIsGeneratingAiBg(false);
    }
  };

  const handleDownloadPoster = async () => {
    if (!posterRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await htmlToImage.toPng(posterRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = `MatchDay_${clubName.replace(/\s+/g, '_')}_vs_${match.opponentName.replace(/\s+/g, '_')}_${match.date}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export poster image:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const captionText = `🔥 MATCH DAY ANNOUNCEMENT 🔥
⚽ ${clubName} 🆚 ${match.opponentName}
🏆 ទម្រង់ការប្រកួត៖ ${match.format}
📅 កាលបរិច្ឆេទ៖ ${formatDateKh(match.date)}
⏰ ម៉ោង៖ ${match.time}
📍 ទីលាន៖ ${match.stadium} ${match.pitchNumber ? `(${match.pitchNumber})` : ''}
💰 ថ្លៃបង់ម្នាក់ៗ៖ ${formatCurrency(match.feePerPlayer, currency)}

#${clubName.replace(/\s+/g, '')} #MatchDay #FootballKhmer #FriendlyMatch`;

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(captionText);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2500);
  };

  // Preset prompts
  const presetPrompts = [
    { label: '🏟️ ទីលានយប់ជ្រៅមានភ្លើងចាំង', prompt: 'Epic stadium lights at night with dramatic fog and atmospheric blue spotlights' },
    { label: '🐉 នាគរាជអគ្គី & រន្ទះ', prompt: 'Fiery glowing dragon crest with thunder lightning effects, dark cinematic background' },
    { label: '🏆 ពានរង្វាន់មាសចែងចាំង', prompt: 'Golden championship trophy with glowing particles and dark luxury fog' },
    { label: '⚡ Cyberpunk Neon', prompt: 'Cyberpunk neon football stadium under starry night sky with cyan and purple laser lines' },
    { label: '🦅 ឥន្ទ្រីមាស & អ័ព្ទ', prompt: 'Golden eagle crest hovering over a dark sports arena with dramatic lighting' },
  ];

  // Background Theme Styles
  const getThemeStyles = () => {
    switch (posterTheme) {
      case 'gold':
        return {
          bg: 'bg-gradient-to-br from-slate-950 via-amber-950/50 to-slate-950',
          border: 'border-amber-500/40',
          glow: 'from-amber-500/20 via-yellow-500/10 to-transparent',
          headerBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          vsBadge: 'bg-gradient-to-r from-amber-600 to-yellow-500 text-slate-950 font-black',
          homeTitle: 'text-amber-200',
          awayTitle: 'text-slate-100',
          accentText: 'text-amber-400',
        };
      case 'derby':
        return {
          bg: 'bg-gradient-to-br from-rose-950/60 via-slate-950 to-blue-950/60',
          border: 'border-rose-500/40',
          glow: 'from-rose-500/20 via-purple-500/10 to-blue-500/20',
          headerBadge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          vsBadge: 'bg-gradient-to-r from-rose-600 to-blue-600 text-white font-black',
          homeTitle: 'text-blue-300',
          awayTitle: 'text-rose-300',
          accentText: 'text-rose-400',
        };
      case 'pitch':
        return {
          bg: 'bg-gradient-to-br from-emerald-950 via-slate-950 to-teal-950',
          border: 'border-emerald-500/40',
          glow: 'from-emerald-500/20 via-teal-500/10 to-transparent',
          headerBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          vsBadge: 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black',
          homeTitle: 'text-emerald-300',
          awayTitle: 'text-teal-200',
          accentText: 'text-emerald-400',
        };
      case 'neon':
      default:
        return {
          bg: 'bg-gradient-to-br from-slate-950 via-blue-950/60 to-slate-950',
          border: 'border-cyan-500/40',
          glow: 'from-cyan-500/20 via-blue-500/10 to-purple-500/20',
          headerBadge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          vsBadge: 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black',
          homeTitle: 'text-cyan-300',
          awayTitle: 'text-blue-200',
          accentText: 'text-cyan-400',
        };
    }
  };

  const theme = getThemeStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl my-6 overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>បង្កើតរូបភាព Match Poster ផុសចូល Facebook / Telegram</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30 flex items-center gap-1">
                  <Wand2 className="w-3 h-3" /> Gemini AI
                </span>
              </h3>
              <p className="text-xs text-slate-400">រចនារូបភាព Poster ស្អាតទាក់ទាញ ឬប្រើ AI បង្កើត Background Artwork ដោយស្វ័យប្រវត្តិ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Controls & Live Preview */}
        <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto flex-1">
          
          {/* Controls Column (Left) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* AI Background Art Generator Section */}
            <div className="bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950 border border-purple-500/30 p-4 rounded-xl space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <Wand2 className="w-4 h-4 text-purple-400 animate-pulse" />
                  <span>Gemini AI Background Art Generator</span>
                </label>
                {aiBgImage && (
                  <button
                    type="button"
                    onClick={() => setAiBgImage(null)}
                    className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCcw className="w-3 h-3" />
                    <span>ជម្រះ AI BG</span>
                  </button>
                )}
              </div>

              {/* Model Picker */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 text-[11px]">ម៉ូឌែល AI:</span>
                <select
                  value={aiModel}
                  onChange={e => setAiModel(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer flex-1 font-semibold"
                >
                  <option value="gemini-3.1-flash-lite-image">Gemini 3.1 Flash Lite Image (Standard)</option>
                  <option value="gemini-nano-banana-2.1">Gemini Nano Banana 2.1 (High Quality 1K)</option>
                </select>
              </div>

              {/* Text Prompt Input */}
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder="ឧ. Stadium lights at night with glowing blue dragon..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Quick Presets */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 block font-medium">ជ្រើសរើសគំនិត Prompt លឿន៖</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {presetPrompts.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setAiPrompt(item.prompt);
                        handleGenerateAiBg(item.prompt);
                      }}
                      className="px-2 py-1 rounded bg-slate-900 hover:bg-purple-950/80 border border-slate-800 hover:border-purple-500/40 text-[11px] text-slate-300 transition-colors cursor-pointer"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate AI Button */}
              <button
                type="button"
                onClick={() => handleGenerateAiBg()}
                disabled={isGeneratingAiBg || (!aiPrompt.trim() && !aiBgImage)}
                className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
              >
                {isGeneratingAiBg ? (
                  <>
                    <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Gemini AI កំពុងបង្កើតរូបភាព...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>{aiBgImage ? 'កែប្រែរូបភាព AI ឡើងវិញ' : 'បង្កើត Background ជាមួយ AI'}</span>
                  </>
                )}
              </button>

              {aiError && (
                <div className="p-2 bg-rose-950/60 border border-rose-800 text-rose-300 text-[11px] rounded-lg flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}
            </div>

            {/* Theme Picker */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2.5">
              <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-blue-400" />
                ជ្រើសរើសម៉ូដ/ពណ៌ Poster (Theme Style)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPosterTheme('neon')}
                  className={`p-2.5 rounded-lg border text-xs font-bold text-left flex items-center gap-2 transition-all cursor-pointer ${
                    posterTheme === 'neon' ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-md' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-cyan-400 shrink-0 shadow-sm"></span>
                  <span>Cyber Neon</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPosterTheme('gold')}
                  className={`p-2.5 rounded-lg border text-xs font-bold text-left flex items-center gap-2 transition-all cursor-pointer ${
                    posterTheme === 'gold' ? 'bg-amber-950/80 border-amber-400 text-amber-300 shadow-md' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0 shadow-sm"></span>
                  <span>Royal Gold</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPosterTheme('derby')}
                  className={`p-2.5 rounded-lg border text-xs font-bold text-left flex items-center gap-2 transition-all cursor-pointer ${
                    posterTheme === 'derby' ? 'bg-rose-950/80 border-rose-400 text-rose-300 shadow-md' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0 shadow-sm"></span>
                  <span>Fiery Derby</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPosterTheme('pitch')}
                  className={`p-2.5 rounded-lg border text-xs font-bold text-left flex items-center gap-2 transition-all cursor-pointer ${
                    posterTheme === 'pitch' ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-md' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-emerald-400 shrink-0 shadow-sm"></span>
                  <span>Grass Pitch</span>
                </button>
              </div>
            </div>

            {/* Aspect Ratio Picker */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                ទំហំ Poster (Aspect Ratio)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAspectRatio('1:1')}
                  className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    aspectRatio === '1:1' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  1:1 (ការរចនាទំហំការ៉េ)
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio('4:5')}
                  className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    aspectRatio === '4:5' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  4:5 (ទម្រង់ Story/Feed)
                </button>
              </div>
            </div>

            {/* Main Action Download & Copy */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleDownloadPoster}
                disabled={isExporting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
              >
                {isExporting ? (
                  <span>កំពុងបង្កើតរូបភាព PNG...</span>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>ទាញយករូបភាព Poster (PNG)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyCaption}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition-colors cursor-pointer"
              >
                {copiedCaption ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>បានចម្លងសារ Caption រួចរាល់!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-blue-400" />
                    <span>ចម្លងសារ Caption សម្រាប់ផុស</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Live Poster Render Preview Column (Right) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-slate-950 p-4 sm:p-6 rounded-2xl border border-slate-800">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              មើលគំរូផ្សាយ (Live Poster Preview)
            </span>

            {/* The Actual Poster Element to export */}
            <div
              ref={posterRef}
              className={`w-full max-w-[420px] rounded-3xl border ${theme.border} ${theme.bg} p-6 sm:p-7 relative overflow-hidden shadow-2xl flex flex-col justify-between select-none ${
                aspectRatio === '4:5' ? 'min-h-[520px]' : 'min-h-[420px]'
              }`}
            >
              {/* AI Generated Background Image Layer if active */}
              {aiBgImage && (
                <img
                  src={aiBgImage}
                  alt="AI Background"
                  className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay pointer-events-none"
                />
              )}

              {/* Background ambient lighting */}
              <div className={`absolute -top-24 -left-24 w-64 h-64 rounded-full bg-gradient-to-br ${theme.glow} blur-3xl opacity-60 pointer-events-none`}></div>
              <div className={`absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-gradient-to-br ${theme.glow} blur-3xl opacity-60 pointer-events-none`}></div>

              {/* Top Header Badge */}
              <div className="relative z-10 flex items-center justify-between mb-4">
                <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest border shadow-sm ${theme.headerBadge}`}>
                  ⚽ MATCH DAY ANNOUNCEMENT
                </span>
                <span className="text-[11px] font-mono font-extrabold text-slate-400 bg-slate-900/80 px-2.5 py-0.5 rounded-full border border-slate-800">
                  {match.format}
                </span>
              </div>

              {/* Central Battle Area (Home vs Away) */}
              <div className="relative z-10 my-auto py-4">
                <div className="flex items-center justify-between gap-3 text-center">
                  
                  {/* Home Team */}
                  <div className="flex-1 flex flex-col items-center">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-900/90 border border-slate-700/80 p-2 shadow-2xl flex items-center justify-center overflow-hidden mb-2.5">
                      {clubLogo && (clubLogo.startsWith('http') || clubLogo.startsWith('data:') || clubLogo.includes('/') || clubLogo.includes('.')) ? (
                        <img src={clubLogo} alt={clubName} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <span className="text-4xl">{clubLogo || '⚽'}</span>
                      )}
                    </div>
                    <h2 className={`text-base sm:text-lg font-black tracking-tight leading-tight max-w-[140px] ${theme.homeTitle}`}>
                      {clubName}
                    </h2>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5 font-bold">
                      HOME
                    </span>
                  </div>

                  {/* Big VS Badge */}
                  <div className="flex flex-col items-center shrink-0 px-1">
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-lg sm:text-xl font-black shadow-2xl transform rotate-[-4deg] border border-white/20 ${theme.vsBadge}`}>
                      VS
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono mt-1 font-bold">
                      #{match.matchNumber}
                    </span>
                  </div>

                  {/* Away Team */}
                  <div className="flex-1 flex flex-col items-center">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-900/90 border border-slate-700/80 p-2 shadow-2xl flex items-center justify-center overflow-hidden mb-2.5">
                      {match.opponentLogo && (match.opponentLogo.startsWith('http') || match.opponentLogo.startsWith('data:') || match.opponentLogo.includes('/') || match.opponentLogo.includes('.')) ? (
                        <img src={match.opponentLogo} alt={match.opponentName} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <span className="text-4xl">{match.opponentLogo || '⚽'}</span>
                      )}
                    </div>
                    <h2 className={`text-base sm:text-lg font-black tracking-tight leading-tight max-w-[140px] ${theme.awayTitle}`}>
                      {match.opponentName}
                    </h2>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5 font-bold">
                      AWAY
                    </span>
                  </div>

                </div>
              </div>

              {/* Match Logistics Card */}
              <div className="relative z-10 bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 border border-slate-800/80 space-y-2 mt-4 shadow-xl">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Calendar className={`w-4 h-4 shrink-0 ${theme.accentText}`} />
                    <span className="font-bold text-white text-[11px] truncate">
                      {formatDateKh(match.date)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className={`w-4 h-4 shrink-0 ${theme.accentText}`} />
                    <span className="font-bold text-white text-[11px]">
                      ម៉ោង {match.time}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80 text-xs">
                  <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="font-bold text-slate-200 text-[11px] truncate">
                    {match.stadium} {match.pitchNumber ? `(${match.pitchNumber})` : ''}
                  </span>
                </div>
              </div>

              {/* Footer Branding */}
              <div className="relative z-10 flex items-center justify-between pt-4 mt-2 border-t border-slate-800/60 text-[10px] text-slate-400 font-bold">
                <span className="tracking-wider uppercase">{clubName}</span>
                <span className={theme.accentText}>#FriendsUnitedFT</span>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
