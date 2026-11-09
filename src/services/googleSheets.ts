import { ClubSettings, Match, Player } from '../types';
import { calculatePlayerAttendance } from '../utils/attendance';
import { calculateMatchFinance, formatCurrency } from '../utils/formatters';

declare global {
  interface Window {
    google?: any;
  }
}

// Read OAuth Client ID from firebase config or env
let cachedClientId: string = '';

export function getGoogleClientId(): string {
  if (cachedClientId) return cachedClientId;
  
  if (import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    cachedClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    return cachedClientId;
  }

  // Fallback to static configured client ID from setup
  try {
    cachedClientId = '162287305946-mrr3m6d034sf321q2sdv62fgilun1jle.apps.googleusercontent.com';
  } catch {
    cachedClientId = '';
  }
  return cachedClientId;
}

export interface GoogleAuthState {
  accessToken: string | null;
  expiresAt: number; // Unix timestamp in ms
  userEmail?: string;
  userName?: string;
}

export interface GoogleSheetSyncConfig {
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  lastSyncedAt?: string;
  autoSync?: boolean;
}

const STORAGE_KEYS = {
  AUTH: 'fuft_google_auth_token_v1',
  SYNC_CONFIG: 'fuft_google_sheet_config_v1',
};

// Global in-memory or loaded token
let authState: GoogleAuthState = {
  accessToken: null,
  expiresAt: 0,
};

// Load saved auth state on boot
try {
  const saved = localStorage.getItem(STORAGE_KEYS.AUTH);
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed.accessToken && parsed.expiresAt > Date.now()) {
      authState = parsed;
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTH);
    }
  }
} catch {
  // Ignore localStorage parsing error
}

export function getSavedSyncConfig(): GoogleSheetSyncConfig | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SYNC_CONFIG);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function saveSyncConfig(config: GoogleSheetSyncConfig | null): void {
  try {
    if (config) {
      localStorage.setItem(STORAGE_KEYS.SYNC_CONFIG, JSON.stringify(config));
    } else {
      localStorage.removeItem(STORAGE_KEYS.SYNC_CONFIG);
    }
  } catch (e) {
    console.error('Error saving sync config', e);
  }
}

export function isGoogleAuthenticated(): boolean {
  return !!authState.accessToken && authState.expiresAt > Date.now() + 60 * 1000;
}

export function getAccessToken(): string | null {
  if (isGoogleAuthenticated()) {
    return authState.accessToken;
  }
  return null;
}

export function disconnectGoogle(): void {
  authState = {
    accessToken: null,
    expiresAt: 0,
  };
  localStorage.removeItem(STORAGE_KEYS.AUTH);
}

// Request Token using Google Identity Services (GSI)
export function requestGoogleAccessToken(promptUserConsent = false): Promise<string> {
  return new Promise((resolve, reject) => {
    const clientId = getGoogleClientId();
    if (!clientId) {
      reject(new Error('រកមិនឃើញ Google OAuth Client ID ឡើយ។ សូមពិនិត្យការកំណត់។'));
      return;
    }

    if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services SDK មិនទាន់ដំណើរការរួចរាល់នៅឡើយ។ សូមរង់ចាំបន្តិច ឬ Refresh ទំព័រ។'));
      return;
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
        callback: (response: any) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error || 'ការភ្ជាប់ Google បានបរាជ័យ'));
            return;
          }

          if (response.access_token) {
            const expiresIn = Number(response.expires_in) || 3599;
            const expiresAt = Date.now() + expiresIn * 1000;
            authState = {
              accessToken: response.access_token,
              expiresAt,
            };
            try {
              localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(authState));
            } catch (err) {
              console.warn('Could not save auth to localStorage', err);
            }
            resolve(response.access_token);
          } else {
            reject(new Error('មិនទទួលបាន Access Token ពី Google ឡើយ'));
          }
        },
        error_callback: (err: any) => {
          reject(new Error(err.message || 'បញ្ហាក្នុងការផ្ទៀងផ្ទាត់ Google Account'));
        }
      });

      client.requestAccessToken({
        prompt: promptUserConsent ? 'consent' : '',
      });
    } catch (e: any) {
      reject(new Error(e.message || 'បរាជ័យក្នុងការបើកផ្ទាំង Google Sign-In'));
    }
  });
}

// Extract clean spreadsheet ID from ID or full Google Sheet URL
export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  return trimmed;
}

// Fetch spreadsheet details to verify access
export async function getSpreadsheetDetails(token: string, spreadsheetId: string): Promise<any> {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `មិនអាចទាញយក Google Sheet បានទេ (កូដកំហុស: ${res.status})`);
  }

  return res.json();
}

// Create a new nicely formatted Google Sheet for the football club
export async function createClubSpreadsheet(
  token: string,
  clubTitle: string,
  settings: ClubSettings,
  players: Player[],
  matches: Match[]
): Promise<GoogleSheetSyncConfig> {
  const sheetPayload = {
    properties: {
      title: clubTitle || `${settings.clubName} - ទិន្នន័យ & ហិរញ្ញវត្ថុ`,
      locale: 'km_KH',
      timeZone: 'Asia/Phnom_Penh',
    },
    sheets: [
      {
        properties: {
          title: 'បញ្ជីកីឡាករ (Players)',
          gridProperties: { rowCount: Math.max(players.length + 10, 50), columnCount: 14, frozenRowCount: 1 },
          tabColor: { red: 0.1, green: 0.6, blue: 0.3 },
        },
      },
      {
        properties: {
          title: 'កាលវិភាគ & ប្រកួត (Matches)',
          gridProperties: { rowCount: Math.max(matches.length + 10, 50), columnCount: 13, frozenRowCount: 1 },
          tabColor: { red: 0.15, green: 0.45, blue: 0.85 },
        },
      },
      {
        properties: {
          title: 'កំណត់ត្រាវត្តមាន & បង់លុយ (Attendance)',
          gridProperties: { rowCount: 100, columnCount: 9, frozenRowCount: 1 },
          tabColor: { red: 0.9, green: 0.6, blue: 0.1 },
        },
      },
      {
        properties: {
          title: 'របាយការណ៍ហិរញ្ញវត្ថុ (Finances)',
          gridProperties: { rowCount: 30, columnCount: 6, frozenRowCount: 1 },
          tabColor: { red: 0.5, green: 0.2, blue: 0.7 },
        },
      },
    ],
  };

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sheetPayload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `មិនអាចបង្កើត Google Sheet បានទេ (កូដ: ${res.status})`);
  }

  const created = await res.json();
  const spreadsheetId = created.spreadsheetId;
  const spreadsheetUrl = created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Apply initial data and formatting
  await syncAllDataToSpreadsheet(token, spreadsheetId, settings, players, matches);

  const config: GoogleSheetSyncConfig = {
    spreadsheetId,
    spreadsheetTitle: created.properties?.title || clubTitle,
    spreadsheetUrl,
    lastSyncedAt: new Date().toISOString(),
    autoSync: true,
  };

  saveSyncConfig(config);
  return config;
}

// Build table data for Players sheet
function buildPlayersSheetData(settings: ClubSettings, players: Player[], matches: Match[]): any[][] {
  const headers = [
    'កូដកីឡាករ (Code)',
    'លេខអាវ (#)',
    'ឈ្មោះកីឡាករ (Name)',
    'ឈ្មោះហៅក្រៅ (Nickname)',
    'តួនាទី (Position)',
    'លេខទូរស័ព្ទ (Phone)',
    'ស្ថានភាព (Status)',
    'ប្រកួតសរុប (Appearances)',
    'គ្រាប់បាល់ (Goals)',
    'បញ្ជូនបាល់ (Assists)',
    'ចូលរួមប្រកួត (Attended)',
    'អវត្តមាន (Missed)',
    'អត្រាវត្តមាន (%)',
    'កំណត់ចំណាំ / មូលហេតុដកចេញ (Notes/Dismissal)',
  ];

  const threshold = settings.absenceThresholdForDismissal ?? 6;

  const rows = players.map(p => {
    const att = calculatePlayerAttendance(p, matches, threshold);
    
    // Performance stats
    let apps = 0;
    let goals = 0;
    let assists = 0;
    matches.forEach(m => {
      if (m.squadPlayerIds?.includes(p.id)) apps++;
      goals += (m.goals || []).filter(g => g.playerId === p.id).length;
      assists += (m.goals || []).filter(g => g.assistPlayerId === p.id).length;
    });

    const statusLabel = 
      p.status === 'dismissed' ? '🚫 បានដកចេញ' :
      p.status === 'injured' ? 'របួស' :
      p.status === 'leave' ? 'សម្រាក' : 'សកម្ម';

    const noteOrReason = p.status === 'dismissed' 
      ? (p.dismissedReason || `អវត្តមាន ${threshold} ប្រកួតជាប់ៗគ្នា`) 
      : (p.notes || '');

    return [
      p.code || '',
      p.number,
      p.name,
      p.nickname || '',
      p.position,
      p.phone || '',
      statusLabel,
      apps,
      goals,
      assists,
      att.attendedCount,
      att.missedCount,
      `${att.attendanceRate}%`,
      noteOrReason,
    ];
  });

  return [headers, ...rows];
}

// Build table data for Matches sheet
function buildMatchesSheetData(settings: ClubSettings, matches: Match[]): any[][] {
  const headers = [
    'ប្រកួតទី (#)',
    'កាលបរិច្ឆេទ (Date)',
    'ម៉ោង (Time)',
    'គូប្រកួត (Opponent)',
    'ទីលាន / តារាង (Venue)',
    'ទម្រង់ (Format)',
    'លទ្ធផល (Result)',
    'ស្ថានភាព (Status)',
    'ថ្លៃកីឡាករម្នាក់ (Fee/Player)',
    'ចំណូលកីឡាករបង់ (Collected)',
    'ថ្លៃតារាង (Pitch Fee)',
    'ចំណាយសរុប (Total Expenses)',
    'សមតុល្យប្រកួត (Balance)',
  ];

  const sortedMatches = [...matches].sort((a, b) => b.matchNumber - a.matchNumber);

  const rows = sortedMatches.map(m => {
    const finance = calculateMatchFinance(m);
    const score = m.status === 'finished' ? `${m.homeScore} - ${m.awayScore}` : '-';
    const statusLabel = 
      m.status === 'finished' ? 'ចប់ការប្រកួត' :
      m.status === 'live' ? 'កំពុងប្រកួត' :
      m.status === 'cancelled' ? 'បានលុបចោល' : 'រៀបចំរួចរាល់';

    const pitchFee = (m.expenses || []).find(e => e.category === 'pitch')?.amount || 0;

    return [
      `ប្រកួតទី ${m.matchNumber}`,
      m.date,
      m.time,
      m.opponentName,
      `${m.stadium} ${m.pitchNumber ? `(តារាង ${m.pitchNumber})` : ''}`,
      m.format,
      score,
      statusLabel,
      formatCurrency(m.feePerPlayer, settings.currency),
      formatCurrency(finance.totalCollected, settings.currency),
      formatCurrency(pitchFee, settings.currency),
      formatCurrency(finance.totalExpense, settings.currency),
      formatCurrency(finance.netBalance, settings.currency),
    ];
  });

  return [headers, ...rows];
}

// Build table data for Attendance & Payments sheet
function buildAttendanceSheetData(settings: ClubSettings, players: Player[], matches: Match[]): any[][] {
  const headers = [
    'កាលបរិច្ឆេទប្រកួត (Date)',
    'គូប្រកួត (Opponent)',
    'កូដកីឡាករ (Code)',
    'ឈ្មោះកីឡាករ (Player)',
    'លេខអាវ (#)',
    'វត្តមាន (Attendance)',
    'ស្ថានភាពបង់ប្រាក់ (Payment)',
    'ចំនួនទឹកប្រាក់ (Amount)',
    'កំណត់ចំណាំ (Notes)',
  ];

  const rows: any[][] = [];
  const playerMap = new Map(players.map(p => [p.id, p]));

  // For each match, list all players and their status
  matches.forEach(m => {
    const squadSet = new Set(m.squadPlayerIds || []);

    players.forEach(p => {
      const isAttended = squadSet.has(p.id);
      const feeStatus = m.playerFees?.[p.id];
      const hasPaid = feeStatus?.hasPaid || false;
      const amountPaid = feeStatus?.amount ?? (hasPaid ? m.feePerPlayer : 0);

      rows.push([
        m.date,
        m.opponentName,
        p.code,
        p.name,
        p.number,
        isAttended ? '✓ ចូលរួម' : '✗ អវត្តមាន',
        !isAttended ? '-' : (hasPaid ? '✓ បង់រួច' : '⚠️ ជំពាក់'),
        isAttended ? formatCurrency(amountPaid, settings.currency) : '-',
        feeStatus?.note || '',
      ]);
    });
  });

  return [headers, ...rows];
}

// Build table data for Financial Overview sheet
function buildFinanceSheetData(settings: ClubSettings, matches: Match[]): any[][] {
  let totalIncome = 0;
  let totalPitchExpenses = 0;
  let totalOtherExpenses = 0;
  let paidCount = 0;
  let unpaidCount = 0;

  matches.forEach(m => {
    (m.squadPlayerIds || []).forEach(pId => {
      const fee = m.playerFees?.[pId];
      if (fee?.hasPaid) {
        totalIncome += fee.amount || m.feePerPlayer;
        paidCount++;
      } else {
        unpaidCount++;
      }
    });

    (m.expenses || []).forEach(exp => {
      if (exp.category === 'pitch') {
        totalPitchExpenses += exp.amount;
      } else {
        totalOtherExpenses += exp.amount;
      }
    });
  });

  const totalExpenses = totalPitchExpenses + totalOtherExpenses;
  const netFund = totalIncome - totalExpenses;

  const rows = [
    ['របាយការណ៍ហិរញ្ញវត្ថុរួមរបស់ក្រុម', settings.clubName, 'ធ្វើបច្ចុប្បន្នភាពចុងក្រោយ', new Date().toLocaleString('km-KH')],
    [],
    ['សូចនាករហិរញ្ញវត្ថុ', 'ចំនួនទឹកប្រាក់ / តម្លៃ', 'កំណត់ចំណាំ'],
    ['ចំណូលកីឡាករបង់ចូលសរុប (Total Income)', formatCurrency(totalIncome, settings.currency), `កីឡាករបង់រួច ${paidCount} នាក់ / ជំពាក់ ${unpaidCount} នាក់`],
    ['ចំណាយថ្លៃតារាងប្រកួត (Pitch Fees)', formatCurrency(totalPitchExpenses, settings.currency), 'ថ្លៃជួលតារាងបាល់'],
    ['ចំណាយទឹកសុទ្ធ & ផ្សេងៗ (Other Expenses)', formatCurrency(totalOtherExpenses, settings.currency), 'ទឹកសុទ្ធ អាហារសម្រន់ ប្រេងកាត'],
    ['ចំណាយសរុបទាំងអស់ (Total Expenses)', formatCurrency(totalExpenses, settings.currency), ''],
    ['សមតុល្យមូលនិធិក្រុមសរុប (Net Balance)', formatCurrency(netFund, settings.currency), netFund >= 0 ? 'ចំណេញ (សល់ក្នុងកញ្ចប់ថវិកា)' : 'ខាត (ជំពាក់)'],
    [],
    ['ការប្រកួតសរុប', `${matches.length} ប្រកួត`, ''],
    ['ប្រកួតដែលបានបញ្ចប់', `${matches.filter(m => m.status === 'finished').length} ប្រកួត`, ''],
  ];

  return rows;
}

// Full sync of all worksheets using Google Sheets values.batchUpdate
export async function syncAllDataToSpreadsheet(
  token: string,
  spreadsheetId: string,
  settings: ClubSettings,
  players: Player[],
  matches: Match[]
): Promise<{ success: boolean; message: string; updatedSheets: number }> {
  // 1. Prepare data for each tab
  const playersData = buildPlayersSheetData(settings, players, matches);
  const matchesData = buildMatchesSheetData(settings, matches);
  const attendanceData = buildAttendanceSheetData(settings, players, matches);
  const financeData = buildFinanceSheetData(settings, matches);

  // 2. Clear old data and write new
  const updatePayload = {
    valueInputOption: 'USER_ENTERED',
    data: [
      {
        range: "'បញ្ជីកីឡាករ (Players)'!A1:N",
        values: playersData,
      },
      {
        range: "'កាលវិភាគ & ប្រកួត (Matches)'!A1:M",
        values: matchesData,
      },
      {
        range: "'កំណត់ត្រាវត្តមាន & បង់លុយ (Attendance)'!A1:I",
        values: attendanceData,
      },
      {
        range: "'របាយការណ៍ហិរញ្ញវត្ថុ (Finances)'!A1:F",
        values: financeData,
      },
    ],
  };

  // Try batchUpdate values
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updatePayload),
  });

  if (!res.ok) {
    // If the sheet names don't match (e.g. user linked an existing raw sheet with default 'Sheet1'), fallback to updating Sheet1 or adding tabs
    const errBody = await res.json().catch(() => ({}));
    
    // Check if error is due to missing sheet tabs
    if (errBody.error?.message?.includes('Unable to parse range') || res.status === 400) {
      // Let's add missing sheets to the existing spreadsheet
      await ensureRequiredSheetsExist(token, spreadsheetId);
      
      // Retry once
      const retryRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (!retryRes.ok) {
        const retryErr = await retryRes.json().catch(() => ({}));
        throw new Error(retryErr.error?.message || 'បរាជ័យក្នុងការធ្វើបច្ចុប្បន្នភាពទិន្នន័យលើ Google Sheet');
      }
    } else {
      throw new Error(errBody.error?.message || `កំហុសក្នុងការ sync ទៅ Google Sheet (${res.status})`);
    }
  }

  // Update last synced time in config
  const currentConfig = getSavedSyncConfig();
  if (currentConfig && currentConfig.spreadsheetId === spreadsheetId) {
    currentConfig.lastSyncedAt = new Date().toISOString();
    saveSyncConfig(currentConfig);
  }

  return {
    success: true,
    message: `បានធ្វើសមកាលកម្មទិន្នន័យកីឡាករ ${players.length} នាក់ និងការប្រកួត ${matches.length} ទៅកាន់ Google Sheet ដោយជោគជ័យ!`,
    updatedSheets: 4,
  };
}

// Helper to ensure all required sheet tabs exist in an existing user spreadsheet
async function ensureRequiredSheetsExist(token: string, spreadsheetId: string): Promise<void> {
  const details = await getSpreadsheetDetails(token, spreadsheetId);
  const existingSheetTitles = new Set(
    (details.sheets || []).map((s: any) => s.properties?.title)
  );

  const requiredTabs = [
    { title: 'បញ្ជីកីឡាករ (Players)', color: { red: 0.1, green: 0.6, blue: 0.3 } },
    { title: 'កាលវិភាគ & ប្រកួត (Matches)', color: { red: 0.15, green: 0.45, blue: 0.85 } },
    { title: 'កំណត់ត្រាវត្តមាន & បង់លុយ (Attendance)', color: { red: 0.9, green: 0.6, blue: 0.1 } },
    { title: 'របាយការណ៍ហិរញ្ញវត្ថុ (Finances)', color: { red: 0.5, green: 0.2, blue: 0.7 } },
  ];

  const requests: any[] = [];
  for (const tab of requiredTabs) {
    if (!existingSheetTitles.has(tab.title)) {
      requests.push({
        addSheet: {
          properties: {
            title: tab.title,
            tabColor: tab.color,
          },
        },
      });
    }
  }

  if (requests.length > 0) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });
  }
}
