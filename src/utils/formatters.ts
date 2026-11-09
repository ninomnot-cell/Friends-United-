import { Match, Player } from '../types';

export function formatCurrency(amount: number, currency: 'KHR' | 'USD' = 'KHR'): string {
  if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  return `${amount.toLocaleString('en-US')} ៛`;
}

export function formatDateKh(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const monthsKh = [
        'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
        'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
      ];
      return `${day} ${monthsKh[monthIndex] || parts[1]} ${year}`;
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString('km-KH');
  } catch {
    return dateStr;
  }
}

export function getPositionName(pos: string): { labelKh: string; labelEn: string; color: string; bg: string } {
  switch (pos) {
    case 'GK':
      return { labelKh: 'អ្នកចាំទី (GK)', labelEn: 'Goalkeeper', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/30' };
    case 'DF':
      return { labelKh: 'ខ្សែការពារ (DF)', labelEn: 'Defender', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/30' };
    case 'MF':
      return { labelKh: 'ខ្សែបម្រើ (MF)', labelEn: 'Midfielder', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30' };
    case 'FW':
      return { labelKh: 'ខ្សែប្រយុទ្ធ (FW)', labelEn: 'Forward', color: 'text-rose-400', bg: 'bg-rose-400/10 border-rose-400/30' };
    default:
      return { labelKh: pos, labelEn: pos, color: 'text-slate-400', bg: 'bg-slate-400/10 border-slate-400/30' };
  }
}

export function getPlayerStatusInfo(status: string): { labelKh: string; color: string; bg: string; border: string } {
  switch (status) {
    case 'active':
      return { labelKh: 'សកម្ម (Active)', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' };
    case 'injured':
      return { labelKh: 'របួស (Injured)', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30' };
    case 'leave':
      return { labelKh: 'សុំច្បាប់ (Leave)', color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/30' };
    case 'dismissed':
      return { labelKh: 'បានដកចេញពីក្រុម (Dismissed)', color: 'text-rose-400', bg: 'bg-rose-500/15', border: 'border-rose-500/30' };
    default:
      return { labelKh: status, color: 'text-slate-400', bg: 'bg-slate-500/15', border: 'border-slate-500/30' };
  }
}

// Generate realistic default avatar SVG as data url if player does not have photo
export function generateDefaultAvatar(name: string, number: number, position: string): string {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2) || `#${number}`;
  const posColor = position === 'GK' ? '#f59e0b' : position === 'DF' ? '#3b82f6' : position === 'MF' ? '#10b981' : '#ef4444';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <rect width="100" height="100" rx="20" fill="#1e293b"/>
    <circle cx="50" cy="40" r="22" fill="${posColor}" fill-opacity="0.25" stroke="${posColor}" stroke-width="2"/>
    <text x="50" y="47" font-family="sans-serif" font-size="20" font-weight="bold" fill="#f8fafc" text-anchor="middle">${initials}</text>
    <path d="M22 86 C22 68, 78 68, 78 86 Z" fill="${posColor}" fill-opacity="0.4" stroke="${posColor}" stroke-width="1.5"/>
    <rect x="36" y="70" width="28" height="16" rx="4" fill="#0f172a"/>
    <text x="50" y="82" font-family="sans-serif" font-size="12" font-weight="bold" fill="#38bdf8" text-anchor="middle">#${number}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Calculate financial metrics for a match
export function calculateMatchFinance(match: Match, playerMapOrPlayers?: Map<string, Player> | Player[]) {
  let totalCollected = 0;
  let totalPending = 0;
  let paidCount = 0;
  let unpaidCount = 0;
  let gkCount = 0;
  let gkPaidCount = 0;
  let exemptCount = 0;

  const playerMap: Map<string, Player> | undefined = Array.isArray(playerMapOrPlayers)
    ? new Map(playerMapOrPlayers.map(p => [p.id, p]))
    : playerMapOrPlayers;

  (match.squadPlayerIds || []).forEach(playerId => {
    const feeInfo = match.playerFees?.[playerId];
    const player = playerMap?.get(playerId);
    const isGK = player?.position === 'GK';
    const isExempt = feeInfo?.isExempt || isGK;

    if (isGK) {
      gkCount++;
    }

    if (isExempt) {
      exemptCount++;
      // Exempt players (GK or special exemption) are not required to pay
      if (feeInfo?.hasPaid) {
        totalCollected += feeInfo.amount !== undefined ? feeInfo.amount : match.feePerPlayer;
        paidCount++;
        if (isGK) gkPaidCount++;
      }
      // If not paid, exempt players do NOT owe debt (no totalPending or unpaidCount)
    } else {
      if (feeInfo?.hasPaid) {
        totalCollected += feeInfo.amount !== undefined ? feeInfo.amount : match.feePerPlayer;
        paidCount++;
      } else {
        const pendingFee = feeInfo?.amount !== undefined ? feeInfo.amount : match.feePerPlayer;
        totalPending += pendingFee;
        unpaidCount++;
      }
    }
  });

  const totalExpense = (match.expenses || []).reduce((sum, item) => sum + (item.amount || 0), 0);
  const netBalance = totalCollected - totalExpense;

  return {
    totalCollected,
    totalPending,
    totalExpense,
    netBalance,
    paidCount,
    unpaidCount,
    gkCount,
    gkPaidCount,
    exemptCount,
    squadCount: (match.squadPlayerIds || []).length
  };
}

export interface MatchVoteAnalysis {
  votedYesPlayers: Player[]; // Vote ទៅលេង
  votedNoPlayers: Player[]; // Vote មិនទៅ
  notVotedPlayers: Player[]; // មិនទាន់ Vote
  flakedPlayers: Player[]; // 🚨 Vote ទៅលេង តែដល់ម៉ោងមិនទៅ (No-show / ខកខាន)
  attendedAsVotedPlayers: Player[]; // ✅ Vote ទៅ & បានមកលេងពិតប្រាកដ
  walkInPlayers: Player[]; // ⚡ មិនបាន Vote ទៅ តែបានមកលេង
  votedCount: number;
  votedYesCount: number;
  votedNoCount: number;
  notVotedCount: number;
  flakedCount: number;
  attendedAsVotedCount: number;
  walkInCount: number;
}

export function getMatchVoteAnalysis(match: Match, players: Player[]): MatchVoteAnalysis {
  const activePlayers = players.filter(p => p.status === 'active');
  const votes = match.votes || {};
  const squadSet = new Set(match.squadPlayerIds || []);

  const votedYesPlayers: Player[] = [];
  const votedNoPlayers: Player[] = [];
  const notVotedPlayers: Player[] = [];
  const flakedPlayers: Player[] = [];
  const attendedAsVotedPlayers: Player[] = [];
  const walkInPlayers: Player[] = [];

  activePlayers.forEach(p => {
    const vote = votes[p.id];
    const isInSquad = squadSet.has(p.id);

    if (vote?.status === 'yes') {
      votedYesPlayers.push(p);
      if (isInSquad) {
        attendedAsVotedPlayers.push(p);
      } else {
        flakedPlayers.push(p);
      }
    } else if (vote?.status === 'no') {
      votedNoPlayers.push(p);
      if (isInSquad) {
        walkInPlayers.push(p);
      }
    } else {
      notVotedPlayers.push(p);
      if (isInSquad) {
        walkInPlayers.push(p);
      }
    }
  });

  return {
    votedYesPlayers,
    votedNoPlayers,
    notVotedPlayers,
    flakedPlayers,
    attendedAsVotedPlayers,
    walkInPlayers,
    votedCount: votedYesPlayers.length + votedNoPlayers.length,
    votedYesCount: votedYesPlayers.length,
    votedNoCount: votedNoPlayers.length,
    notVotedCount: notVotedPlayers.length,
    flakedCount: flakedPlayers.length,
    attendedAsVotedCount: attendedAsVotedPlayers.length,
    walkInCount: walkInPlayers.length,
  };
}

// Generate Telegram poll / RSVP message
export function generateTelegramVotePollText(match: Match, players: Player[], clubName: string): string {
  const analysis = getMatchVoteAnalysis(match, players);

  let text = `🗳️ ការបោះឆ្នោតចូលរួមប្រកួត (Pre-Match Vote / RSVP) ⚽\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `⚔️ ការប្រកួត: ${clubName} vs ${match.opponentName}\n`;
  text += `📅 កាលបរិច្ឆេទ: ${formatDateKh(match.date)} (ម៉ោង ${match.time})\n`;
  text += `🏟️ ទីលាន: ${match.stadium} ${match.pitchNumber ? `(${match.pitchNumber})` : ''}\n`;
  text += `🧤 ចំណាំ៖ អ្នកចាំទី (GK) មិនតម្រូវឱ្យបង់ប្រាក់ថ្លៃតារាងឡើយ (Free)\n\n`;

  text += `📊 សរុបការ Vote: ${analysis.votedCount}/${analysis.votedCount + analysis.notVotedCount} នាក់\n`;
  text += `• ✅ ទៅលេង: ${analysis.votedYesCount} នាក់\n`;
  text += `• ❌ មិនទៅ: ${analysis.votedNoCount} នាក់\n`;
  text += `• ❓ មិនទាន់ Vote: ${analysis.notVotedCount} នាក់\n\n`;

  text += `✅ បញ្ជីកីឡាករ Vote ទៅលេង (${analysis.votedYesCount} នាក់):\n`;
  if (analysis.votedYesPlayers.length > 0) {
    text += analysis.votedYesPlayers.map(p => `  ${p.position === 'GK' ? '🧤' : '🏃'} #${p.number} ${p.name} (${p.position})`).join('\n') + '\n';
  } else {
    text += `  (មិនទាន់មាន)\n`;
  }

  if (analysis.votedNoPlayers.length > 0) {
    text += `\n❌ បញ្ជីកីឡាករ Vote មិនទៅ (${analysis.votedNoCount} នាក់):\n`;
    text += analysis.votedNoPlayers.map(p => {
      const reason = match.votes?.[p.id]?.reason;
      return `  - #${p.number} ${p.name}${reason ? ` (${reason})` : ''}`;
    }).join('\n') + '\n';
  }

  if (match.squadPlayerIds && match.squadPlayerIds.length > 0 && analysis.flakedPlayers.length > 0) {
    text += `\n🚨 ក្រុមកីឡាករ Vote ទៅ តែដល់ម៉ោងមិនទៅ (${analysis.flakedPlayers.length} នាក់):\n`;
    text += analysis.flakedPlayers.map(p => `  ⚠️ #${p.number} ${p.name} (${p.code})`).join('\n') + '\n';
  }

  if (analysis.notVotedPlayers.length > 0) {
    text += `\n❓ កីឡាករមិនទាន់បាន Vote (${analysis.notVotedPlayers.length} នាក់):\n`;
    text += analysis.notVotedPlayers.map(p => `  - #${p.number} ${p.name}`).join('\n') + '\n';
  }

  text += `\n🙏 សូមបងប្អូនកីឡាករជួយដាក់ Vote ឱ្យបានគ្រប់គ្នាដើម្បីងាយស្រួលក្រុមការងាររៀបចំកម្លាំង!`;
  return text;
}

// Generate Telegram message ready to paste into group chat
export function generateTelegramShareText(match: Match, players: Player[], clubName: string, currency: 'KHR' | 'USD'): string {
  const playerMap = new Map(players.map(p => [p.id, p]));
  const fin = calculateMatchFinance(match, playerMap);

  let text = `⚽ របាយការណ៍ការប្រកួត & ថ្លៃតារាង | ${clubName} ⚽\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `⚔️ ការប្រកួត: ${clubName} vs ${match.opponentName}\n`;
  text += `📅 កាលបរិច្ឆេទ: ${formatDateKh(match.date)} (ម៉ោង ${match.time})\n`;
  text += `🏟️ ទីលាន: ${match.stadium} ${match.pitchNumber ? `(${match.pitchNumber})` : ''}\n`;
  if (match.status === 'finished') {
    text += `🏆 លទ្ធផល: ${match.homeScore} - ${match.awayScore} (${match.homeScore > match.awayScore ? 'ឈ្នះ 🎉' : match.homeScore < match.awayScore ? 'ចាញ់' : 'ស្មើ'})\n`;
  }
  text += `\n💰 ស្ថានភាពចំណូល-ចំណាយថ្លៃតារាង:\n`;
  text += `• ថ្លៃបង់ម្នាក់ៗ: ${formatCurrency(match.feePerPlayer, currency)} (អ្នកចាំទី GK មិនតម្រូវឱ្យបង់)\n`;
  text += `• ចំណូលប្រមូលបាន: ${formatCurrency(fin.totalCollected, currency)} (${fin.paidCount}/${fin.squadCount} នាក់)\n`;
  text += `• ចំណាយថ្លៃតារាង & ផ្សេងៗ: ${formatCurrency(fin.totalExpense, currency)}\n`;
  text += `• សមតុល្យសល់/ខ្វះ: ${fin.netBalance >= 0 ? '+' : ''}${formatCurrency(fin.netBalance, currency)} ${fin.netBalance >= 0 ? '🟢 (សល់ក្នុងមូលនិធិ)' : '🔴 (ខ្វះ)'}\n\n`;

  text += `✅ បានបង់រួច (${fin.paidCount} នាក់):\n`;
  const paidList = match.squadPlayerIds
    .filter(id => match.playerFees?.[id]?.hasPaid)
    .map(id => {
      const p = playerMap.get(id);
      const fee = match.playerFees[id];
      const isGK = p?.position === 'GK';
      return `  - #${p?.number || ''} ${p?.name || 'កីឡាករ'} ${isGK ? '(🧤 GK ស្ម័គ្រចិត្ត)' : ''} (${formatCurrency(fee?.amount || match.feePerPlayer, currency)})`;
    });
  text += paidList.length > 0 ? paidList.join('\n') + '\n' : '  (មិនទាន់មាន)\n';

  // Exclude GK from unpaid list because GK is not required to pay!
  const unpaidList = match.squadPlayerIds
    .filter(id => !match.playerFees?.[id]?.hasPaid && playerMap.get(id)?.position !== 'GK')
    .map(id => {
      const p = playerMap.get(id);
      return `  - #${p?.number || ''} ${p?.name || 'កីឡាករ'} (${p?.code || ''})`;
    });

  if (unpaidList.length > 0) {
    text += `\n⏳ មិនទាន់បានបង់ (${unpaidList.length} នាក់):\n`;
    text += unpaidList.join('\n') + '\n';
  }

  // Mention GK exempted players if any
  const gkList = match.squadPlayerIds.filter(id => playerMap.get(id)?.position === 'GK');
  if (gkList.length > 0) {
    text += `\n🧤 អ្នកចាំទី (លើកលែងថ្លៃប្រកួត):\n`;
    text += gkList.map(id => {
      const p = playerMap.get(id);
      const hasPaid = match.playerFees?.[id]?.hasPaid;
      return `  - #${p?.number || ''} ${p?.name || 'កីឡាករ'} ${hasPaid ? '(បានបង់ស្ម័គ្រចិត្ត)' : '(មិនគិតថ្លៃ)'}`;
    }).join('\n') + '\n';
  }

  text += `\n🙏 សូមបងប្អូនកីឡាករជួយទូទាត់ឱ្យបានរួចរាល់។ អរគុណ!`;
  return text;
}

/**
 * Compresses and resizes an uploaded image to a compact avatar thumbnail.
 * Keeps storage footprint to ~15KB - 25KB, preventing localStorage QuotaExceededError.
 */
export function compressAndResizeImage(file: File, maxDim = 240): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result;
      if (typeof src !== 'string') {
        resolve('');
        return;
      }
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.82);
            resolve(compressed);
          } else {
            resolve(src);
          }
        } catch {
          resolve(src);
        }
      };
      img.onerror = () => resolve(src);
      img.src = src;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}
