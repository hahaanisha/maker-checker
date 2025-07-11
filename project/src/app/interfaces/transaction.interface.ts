// src/app/interfaces/transaction.interface.ts

export interface Transaction {
  _id?: string; // MongoDB's unique identifier, generated by the backend
  id?: string; // Your custom 'T' + Date.now() ID, generated by the backend (made optional for new transactions from frontend)
  fromAccount: string;
  toAccount: string;
  amount: number;
  currency: string;
  description: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'DELETED';
  rejectionReason?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  createdAt?: string; // Generated by the backend (made optional for new transactions from frontend)
  createdBy?: string;
  acceptedBy?: string;
  rejectedBy?: string;
  deletedAt?: string; // Added for soft delete functionality
  deletedBy?: string; // Added for soft delete functionality
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
