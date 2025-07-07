// src/app/home/components/sidebar/components/transaction-details/transaction-details.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Transaction } from '../interfaces/transaction.interface'
import { StatusTagComponent } from '../shared/status-tag/status-tag';

@Component({
  selector: 'app-transaction-details',
  standalone: true,
  imports: [CommonModule, DatePipe, StatusTagComponent], // Add StatusTagComponent here
  templateUrl: './transaction-details.html',
  styleUrls: ['./transaction-details.scss']
})
export class TransactionDetailsComponent {
  @Input() transaction!: Transaction;
}
