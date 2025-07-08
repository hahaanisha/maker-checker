// src/app/home/components/sidebar/components/transaction-details/transaction-details.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Transaction } from '../interfaces/transaction.interface'; // Corrected import path
import { StatusTagComponent } from '../shared/status-tag/status-tag'; // Corrected import path for StatusTagComponent

@Component({
  selector: 'app-transaction-details',
  standalone: true,
  imports: [CommonModule, DatePipe, StatusTagComponent],
  templateUrl: './transaction-details.html',
  styleUrls: ['./transaction-details.scss']
})
export class TransactionDetailsComponent {
  @Input() transaction!: Transaction;
}
