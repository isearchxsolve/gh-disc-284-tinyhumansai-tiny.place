// types.ts
export type BountyState =
  | 'OPEN'
  | 'CLAIMED'
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'PAID'
  | 'REJECTED'
  | 'CANCELLED';

export type Currency = 'USDC' | 'USDT' | 'SOL' | 'wDOOM';

export interface ChainRef {
  rail: 'base' | 'solana' | 'doom';
  address: string;
}

export interface BountyRecord {
  id: string;
  issueRef: string;
  title: string;
  amountMinor: bigint;
  currency: Currency;
  state: BountyState;
  assignee: string | null;
  payoutTarget: ChainRef | null;
  version: number;
  createdAt: number;
  updatedAt: number;
  approvedBy: string | null;
  approvedAt: number | null;
  payoutTxRef: string | null;
  payoutAttempts: number;
  lastError: string | null;
  rejectionReason: string | null;
}
