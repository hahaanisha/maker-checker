// src/app/home/components/sidebar/components/transaction-history/transaction-history.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Transaction } from '../interfaces/transaction.interface'; // Adjust path as needed

@Component({
  selector: 'app-transaction-history',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './transaction-history.html',
  styleUrls: ['./transaction-history.scss']
})
export class TransactionHistoryComponent {
  @Input() transaction!: Transaction; // Input property to receive the transaction data
}
