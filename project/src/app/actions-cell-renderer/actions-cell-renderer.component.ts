import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

import { Transaction } from '../interfaces/transaction.interface';
import { TransactionTableComponent } from '../ag-grid/ag-grid'; // Corrected import path for TransactionTableComponent

@Component({
  selector: 'app-actions-cell-renderer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './actions-cell-renderer.html',
  styleUrls: ['./actions-cell-renderer.scss']
})
export class ActionsCellRendererComponent implements ICellRendererAngularComp {
  params!: ICellRendererParams;
  transaction!: Transaction;
  role: string | null = null;
  parentComponent!: TransactionTableComponent;

  showEdit = false;
  showDelete = false;
  showAccept = false;
  showReject = false;

  agInit(params: ICellRendererParams): void {
    this.params = params;
    this.transaction = params.data;
    this.role = params.context.role;
    this.parentComponent = params.context.parentComponent as TransactionTableComponent;

    this.updateButtonVisibility();
  }

  refresh(params: ICellRendererParams): boolean {
    this.params = params;
    this.transaction = params.data;
    this.role = params.context.role;
    this.parentComponent = params.context.parentComponent as TransactionTableComponent;

    this.updateButtonVisibility();
    return true;
  }

  private updateButtonVisibility(): void {
    const status = this.transaction.status;
    const isMaker = this.role === 'maker' || this.role === 'admin';
    const isChecker = this.role === 'checker' || this.role === 'admin';

    this.showEdit = isMaker && status === 'PENDING';
    this.showDelete = isMaker && status === 'PENDING';
    this.showAccept = isChecker && status === 'PENDING';
    this.showReject = isChecker && status === 'PENDING';
  }

  onEditClick(): void {
    if (this.parentComponent) {
      this.parentComponent.onEdit(this.transaction);
    }
  }

  onDeleteClick(): void {
    if (this.parentComponent) {
      // CRITICAL FIX: Pass MongoDB's _id for operations
      this.parentComponent.onDelete(this.transaction._id as string);
    }
  }

  onAcceptClick(): void {
    if (this.parentComponent) {
      // CRITICAL FIX: Pass MongoDB's _id for operations
      this.parentComponent.onAccept(this.transaction._id as string);
    }
  }

  onRejectClick(): void {
    if (this.parentComponent) {
      // CRITICAL FIX: Pass MongoDB's _id for operations
      this.parentComponent.onReject(this.transaction._id as string);
    }
  }
}
