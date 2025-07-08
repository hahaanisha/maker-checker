// src/app/home/components/transaction-form/transaction-form.component.ts
import { Component, Input, Output, EventEmitter, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Transaction } from '../interfaces/transaction.interface';
import { TransactionService } from '../services/service';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-transaction-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './form.html',
  styleUrls: ['./form.scss']
})
export class TransactionFormComponent implements OnInit {
  @Input() isEditMode: boolean = false;
  @Input() transaction: Transaction | null = null;

  @Output() transactionAdded = new EventEmitter<Transaction>();
  @Output() transactionUpdated = new EventEmitter<Transaction>();
  @Output() cancel = new EventEmitter<void>();

  @ViewChild('txnForm') txnForm!: NgForm;

  formData: Transaction = {
    fromAccount: '',
    toAccount: '',
    amount: 0,
    currency: '',
    description: '',
    createdBy: '',
    status: 'PENDING'
  };

  constructor(private transactionService: TransactionService) { }

  ngOnInit(): void {
    if (this.isEditMode && this.transaction) {
      this.formData = { ...this.transaction };
    } else {
      this.formData = {
        fromAccount: '',
        toAccount: '',
        amount: 0,
        currency: '',
        description: '',
        createdBy: '',
        status: 'PENDING'
      };
    }
  }

  onSubmit(): void {
    if (this.txnForm.valid) {
      if (this.isEditMode) {
        this.transactionService.updateTransaction(this.formData)
          .pipe(take(1))
          .subscribe({
            next: (updatedTx) => {
              this.transactionUpdated.emit(updatedTx);
              this.txnForm.resetForm();
            },
            error: (error) => {
              console.error('Error updating transaction:', error);
            }
          });
      } else {
        this.transactionService.addTransaction(this.formData)
          .pipe(take(1))
          .subscribe({
            next: (newTx) => {
              this.transactionAdded.emit(newTx);
              this.txnForm.resetForm();
            },
            error: (error) => {
              console.error('Error adding transaction:', error);
            }
          });
      }
    }
  }

  onCancel(): void {
    this.cancel.emit();
    this.txnForm.resetForm();
  }
}
