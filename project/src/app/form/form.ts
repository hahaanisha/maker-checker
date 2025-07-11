import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Transaction } from '../interfaces/transaction.interface';
import { TransactionService } from '../services/service'; // Corrected import path
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-transaction-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './form.html',
  styleUrls: ['./form.scss']
})
export class TransactionFormComponent implements OnInit, OnChanges {
  @Input() isEditMode: boolean = false;
  @Input() transaction: Transaction | null = null;
  @Input() accountNumbers: string[] = []; // Input for account numbers

  @Output() transactionAdded = new EventEmitter<Transaction>();
  @Output() transactionUpdated = new EventEmitter<Transaction>();
  @Output() cancel = new EventEmitter<void>();

  @ViewChild('txnForm') txnForm!: NgForm; // Reference to the form itself for validation/reset

  currentTransaction: Transaction = this.initializeNewTransaction();

  constructor(private transactionService: TransactionService) { } // Inject TransactionService

  ngOnInit(): void {
    if (this.isEditMode && this.transaction) {
      this.currentTransaction = { ...this.transaction };
    } else {
      this.currentTransaction = this.initializeNewTransaction();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['transaction'] && this.isEditMode && this.transaction) {
      this.currentTransaction = { ...this.transaction };
    }
    // No specific handling for accountNumbers changes needed here,
    // as it's directly bound to the select options in the template.
  }

  private initializeNewTransaction(): Transaction {
    return {
      fromAccount: '',
      toAccount: '',
      amount: 0,
      currency: '', // Fixed: Default to empty string for "Select Currency"
      description: '',
      status: 'PENDING',
      createdBy: localStorage.getItem('role') || 'Unknown Maker'
    };
  }

  onSubmit(): void {
    if (this.txnForm.valid) { // Check form validity
      if (this.isEditMode) {
        this.transactionService.updateTransaction(this.currentTransaction)
          .pipe(take(1))
          .subscribe({
            next: (updatedTx) => {
              this.transactionUpdated.emit(updatedTx); // Emit after successful update
              this.txnForm.resetForm(); // Reset form after successful submission
            },
            error: (error) => {
              console.error('Error updating transaction:', error);
              // Handle error (e.g., show a message to the user)
            }
          });
      } else {
        this.transactionService.addTransaction(this.currentTransaction)
          .pipe(take(1))
          .subscribe({
            next: (newTx) => {
              this.transactionAdded.emit(newTx); // Emit after successful add
              this.txnForm.resetForm(); // Reset form after successful submission
            },
            error: (error) => {
              console.error('Error adding transaction:', error);
              // Handle error (e.g., show a message to the user)
            }
          });
      }
    } else {
      // Mark all fields as touched to display validation errors
      this.txnForm.form.markAllAsTouched();
    }
  }

  onCancel(): void {
    this.cancel.emit();
    this.txnForm.resetForm(); // Reset the form when cancelled
  }
}
