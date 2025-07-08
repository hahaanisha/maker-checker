
import { Component, Input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Transaction } from '../interfaces/transaction.interface'; // Corrected import path

@Component({
  selector: 'app-transaction-history',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './transaction-history.html',
  styleUrls: ['./transaction-history.scss']
})
export class TransactionHistoryComponent {
  @Input() transaction!: Transaction;
}
