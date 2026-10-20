import type { Timestamp } from 'firebase/firestore';

export type FineStatus = 'UNPAID' | 'PARTIAL' | 'PAID';
export type PastryMode = 'SINGOLARMENTE' | 'IN_COPPIA';

export interface Player {
  id: string;
  seasonId?: string;
  name: string;
  surname: string;
  shirtNumber?: number;
  active: boolean;
  createdAt: Timestamp;
}

export interface PublicPlayer {
  id: string;
  seasonId?: string;
  name: string;
  surname: string;
  shirtNumber?: number;
  active: boolean;
  fineTotal: number;
  paidTotal: number;
  remainingTotal: number;
  fineCount: number;
}

export interface Fine {
  id: string;
  seasonId?: string;
  playerId: string;
  playerName: string;
  category: string;
  description?: string;
  baseAmount: number;
  multiplier: number;
  finalAmount: number;
  date: Timestamp;
  isMatchDay: boolean;
  paidAmount: number;
  remainingAmount: number;
  status: FineStatus;
  pastryRequired?: boolean;
  pastryMode?: PastryMode;
  minutes?: number;
  voidedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PaymentAllocation {
  fineId: string;
  amount: number;
}

export interface Payment {
  id: string;
  seasonId?: string;
  playerId: string;
  playerName: string;
  amount: number;
  date: Timestamp;
  note?: string;
  allocations: PaymentAllocation[];
  canceledAt?: Timestamp;
  createdAt: Timestamp;
}

export interface PublicSummary {
  fineTotal: number;
  paidTotal: number;
  remainingTotal: number;
  fineCount: number;
  updatedAt?: Timestamp;
}

export interface CreateFineInput {
  playerId: string;
  category: string;
  description?: string;
  baseAmount: number;
  isMatchDay: boolean;
  date: Date;
  pastryRequired?: boolean;
  pastryMode?: PastryMode;
  minutes?: number;
  communicatedInAdvance?: boolean;
}
