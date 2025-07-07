// src/app/interfaces/transaction.interface.ts

export interface Transaction {
  id: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  currency: string;
  description: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'DELETED';
  rejectionReason?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  createdAt?: string;
  createdBy?: string;
  acceptedBy?: string;
  rejectedBy?: string;
}

export interface FilterOptions {
  referenceNo: string;
  transferFrom: string;
  transferTo: string;
  statuses: {
    PENDING: boolean;
    ACCEPTED: boolean;
    REJECTED: boolean;
    DELETED: boolean;
  };
  dateRange: 'custom' | 'thisWeek' | 'lastMonth' | 'all';
  fromDate: string;
  toDate: string;
}
