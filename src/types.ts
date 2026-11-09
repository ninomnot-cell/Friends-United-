export type Position = 'GK' | 'DF' | 'MF' | 'FW';

export type PlayerStatus = 'active' | 'injured' | 'leave' | 'dismissed';

export interface Player {
  id: string;
  code: string; // Unique Player ID, e.g., "FC-01", "FC-07"
  name: string; // ឈ្មោះកីឡាករ
  nickname?: string; // ឈ្មោះហៅក្រៅ
  number: number; // លេខអាវ
  position: Position; // តួនាទី
  photo: string; // Photo data URL or URL
  phone: string; // លេខទូរស័ព្ទ / Telegram
  preferredFoot?: 'left' | 'right' | 'both';
  status: PlayerStatus;
  dateJoined: string;
  notes?: string;
  dismissedReason?: string; // មូលហេតុដកចេញ (ឧ. អវត្តមាន 6 ប្រកួតជាប់ៗគ្នា)
  dismissedDate?: string; // កាលបរិច្ឆេទដកចេញ
}

export type ExpenseCategory = 'pitch' | 'water' | 'referee' | 'firstaid' | 'ball_equipment' | 'other';

export interface MatchExpense {
  id: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  notes?: string;
}

export interface PlayerFeeStatus {
  hasPaid: boolean;
  amount: number;
  paidAt?: string;
  note?: string;
  isExempt?: boolean; // GK is exempt by default (មិនតម្រូវអោយបង់ តែអាចបង់ស្ម័គ្រចិត្តបាន)
}

export type PlayerVoteStatus = 'yes' | 'no'; // 'yes' = ទៅលេង, 'no' = អត់ទៅ

export interface MatchVoteRecord {
  votedAt?: string;
  status: PlayerVoteStatus; // 'yes' | 'no'
  reason?: string; // មូលហេតុ ឧ. ជាប់រវល់ការងារ, ឈឺ...
}

export interface MatchGoal {
  id: string;
  playerId: string;
  scorerName?: string;
  assistPlayerId?: string;
  assistName?: string;
  minute: number;
  type: 'regular' | 'penalty' | 'freekick' | 'header' | 'own_goal';
}

export interface MatchCard {
  id: string;
  playerId: string;
  playerName?: string;
  type: 'yellow' | 'red';
  minute: number;
  reason?: string;
}

export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'cancelled';
export type MatchFormat = '5v5' | '7v7' | '9v9' | '11v11';

export interface Match {
  id: string;
  matchNumber: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  stadium: string; // ឈ្មោះតារាង / ទីលាន
  pitchNumber?: string; // តារាងលេខ 1, etc.
  format: MatchFormat;
  opponentName: string; // ឈ្មោះក្រុមគូប្រកួត
  opponentLogo?: string;
  status: MatchStatus;
  homeScore: number;
  awayScore: number;
  feePerPlayer: number; // ថ្លៃកីឡាករម្នាក់បង់ (KHR or USD)
  squadPlayerIds: string[]; // កីឡាករចូលរួមប្រកួតនេះ
  startingLineupIds?: string[];
  playerFees: Record<string, PlayerFeeStatus>; // playerId -> fee status
  votes?: Record<string, MatchVoteRecord>; // playerId -> vote record ('yes' | 'no')
  expenses: MatchExpense[]; // ថ្លៃតារាង, ថ្លៃទឹក, etc.
  goals: MatchGoal[];
  cards: MatchCard[];
  mvpPlayerId?: string;
  matchNotes?: string;
  stats?: {
    shotsOnTargetHome?: number;
    shotsOnTargetAway?: number;
    cornersHome?: number;
    cornersAway?: number;
    foulsHome?: number;
    foulsAway?: number;
  };
}

export interface ClubSettings {
  clubName: string;
  clubShortName: string;
  clubLogo: string;
  currency: 'KHR' | 'USD';
  defaultFeePerPlayer: number; // e.g. 10000 ៛
  defaultPitchCost: number; // e.g. 80000 ៛
  managerName: string;
  managerPhone: string;
  homeKitColor: string;
  awayKitColor: string;
  absenceThresholdForDismissal?: number; // ចំនួនប្រកួតអវត្តមានជាប់ៗគ្នាកំណត់សម្រាប់ដកចេញពីក្រុម (Default: 6)
}
