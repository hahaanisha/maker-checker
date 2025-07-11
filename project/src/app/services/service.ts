import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Transaction } from '../interfaces/transaction.interface';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private apiUrl = 'http://localhost:3000/api';
  private http = inject(HttpClient);

  getTransactions(): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${this.apiUrl}/transactions`);
  }

  addTransaction(transaction: Transaction): Observable<Transaction> {
    return this.http.post<Transaction>(`${this.apiUrl}/transactions`, transaction);
  }

  updateTransaction(transaction: Transaction): Observable<Transaction> {
    // Use transaction._id for the PUT request
    return this.http.put<Transaction>(`${this.apiUrl}/transactions/${transaction._id}`, transaction);
  }

  updateTransactionStatus(
    _id: string,
    status: 'ACCEPTED' | 'REJECTED' | 'DELETED',
    rejectionReason?: string,
    byUser?: string
  ): Observable<Transaction> {
    const body: any = { status, byUser };
    if (rejectionReason) {
      body.rejectionReason = rejectionReason;
    }
    // Use _id for the PATCH request
    return this.http.patch<Transaction>(`${this.apiUrl}/transactions/${_id}/status`, body);
  }

  deleteTransaction(_id: string, byUser?: string): Observable<Transaction> {
    // This will perform a soft delete by updating status to 'DELETED'
    return this.http.patch<Transaction>(`${this.apiUrl}/transactions/${_id}/status`, { status: 'DELETED', byUser });
  }

  // New: Method to fetch account numbers
  getAccountNumbers(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/accounts`);
  }
}
