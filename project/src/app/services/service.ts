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

        return this.http.get<Transaction[]>(`${this.apiUrl}?_t=${Date.now()}`);
    }

    addTransaction(newTransaction: Transaction): Observable<Transaction> {
        return this.http.post<Transaction>(this.apiUrl, newTransaction);
    }


    updateTransaction(updatedTransaction: Transaction): Observable<Transaction> {
        return this.http.put<Transaction>(`${this.apiUrl}/${updatedTransaction.id}`, updatedTransaction);
    }

    updateTransactionStatus(
        id: string,
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
            byUser?: string;
        } = { status: newStatus };

        if (newStatus === 'ACCEPTED') {
            payload.acceptedAt = new Date().toISOString();
            payload.acceptedBy = byUser;
        } else if (newStatus === 'REJECTED') {
            payload.rejectedAt = new Date().toISOString();
            payload.rejectedBy = byUser;
            payload.rejectionReason = rejectionReason;
        }


        return this.http.patch<Transaction>(`${this.apiUrl}/${id}/status`, { ...payload, byUser: byUser });
    }

    deleteTransaction(id: string, byUser?: string): Observable<Transaction> {
        return this.updateTransactionStatus(id,'DELETED',undefined,byUser)
    }
}
