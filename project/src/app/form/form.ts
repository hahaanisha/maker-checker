// src/app/home/components/transaction-form/transaction-form.component.ts
import { Component, Input, Output, EventEmitter, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Transaction } from '../interfaces/transaction.interface'; // Import the Transaction interface

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
  @Input() nextTransactionId: string = '';

  @Output() transactionAdded = new EventEmitter<Transaction>();
  @Output() transactionUpdated = new EventEmitter<Transaction>();
  @Output() cancel = new EventEmitter<void>();

  @ViewChild('txnForm') txnForm!: NgForm;

  formData: Transaction = {
    id: '',
    fromAccount: '',
    toAccount: '',
    amount: 0,
    currency: '',
    description: '',
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };

  ngOnInit(): void {
    if (this.isEditMode && this.transaction) {
      this.formData = { ...this.transaction };
    } else {
      this.formData = {
        id: this.nextTransactionId,
        fromAccount: '',
        toAccount: '',
        amount: 0,
        currency: '',
        description: '',
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };
    }
  }

  onSubmit(): void {
    if (this.txnForm.valid) {
      if (this.isEditMode) {
        this.transactionUpdated.emit(this.formData);
      } else {
        this.transactionAdded.emit(this.formData);
      }
      this.txnForm.resetForm();
    }
  }

  onCancel(): void {
    this.cancel.emit();
    this.txnForm.resetForm();
  }
}

