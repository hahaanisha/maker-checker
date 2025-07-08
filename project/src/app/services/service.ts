// src/app/services/transaction.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Transaction } from '../interfaces/transaction.interface';

@Injectable({
    providedIn: 'root'
})
export class TransactionService {

    private apiUrl = 'http://localhost:3000/api/transactions';
    private http = inject(HttpClient);

    constructor() { }

    getTransactions(): Observable<Transaction[]> {
        // Removed `_t=${Date.now()}` as it's typically for static file caching, not dynamic API calls
        return this.http.get<Transaction[]>(this.apiUrl);
    }

    addTransaction(newTransaction: Transaction): Observable<Transaction> {
        // When adding, the backend generates _id, id, status, createdAt
        // The frontend should send the basic transaction data without these fields if possible
        // However, if the interface requires them, ensure they are optional or omit them
        return this.http.post<Transaction>(this.apiUrl, newTransaction);
    }

    // Changed to accept _id as the primary identifier for updates
    updateTransaction(updatedTransaction: Transaction): Observable<Transaction> {
        if (!updatedTransaction._id) {
            throw new Error('Transaction _id is required for update operation.');
        }
        return this.http.put<Transaction>(`${this.apiUrl}/${updatedTransaction._id}`, updatedTransaction);
    }

    // Changed to accept _id as the primary identifier for status updates
    updateTransactionStatus(
        _id: string, // Now explicitly expecting _id
        newStatus: 'ACCEPTED' | 'REJECTED' | 'DELETED',
        rejectionReason?: string,
        byUser?: string
    ): Observable<Transaction> {
        const payload: {
            status: string;
            rejectionReason?: string;
            acceptedAt?: string;
            rejectedAt?: string;
            acceptedBy?: string;
            rejectedBy?: string;
            byUser?: string; // byUser is passed directly in the payload
        } = { status: newStatus };

        if (newStatus === 'ACCEPTED') {
            payload.acceptedAt = new Date().toISOString();
            payload.acceptedBy = byUser;
        } else if (newStatus === 'REJECTED') {
            payload.rejectedAt = new Date().toISOString();
            payload.rejectedBy = byUser;
            payload.rejectionReason = rejectionReason;
        } else if (newStatus === 'DELETED') {
            // Add specific fields for soft delete if needed
            // These would be handled by the backend based on the status change
        }

        // Pass byUser directly in the payload
        return this.http.patch<Transaction>(`${this.apiUrl}/${_id}/status`, { ...payload, byUser: byUser });
    }

    // Changed to accept _id for deletion
    deleteTransaction(_id: string, byUser?: string): Observable<Transaction> {
        return this.updateTransactionStatus(_id, 'DELETED', undefined, byUser);
    }
}
