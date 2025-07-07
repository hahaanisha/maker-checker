import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

import { Transaction } from '../interfaces/transaction.interface';
import { TransactionTableComponent } from '../ag-grid/ag-grid'; // Import TransactionTableComponent

@Component({
  selector: 'app-actions-cell-renderer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './actions-cell-renderer.html', // Use templateUrl
  styleUrls: ['./actions-cell-renderer.scss'] // Corrected styleUrls syntax
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

    console.log('ActionsCellRenderer (agInit): Transaction ID:', this.transaction.id, 'Role:', this.role, 'Status:', this.transaction.status);
    this.updateButtonVisibility();
  }

  refresh(params: ICellRendererParams): boolean {
    this.params = params;
    this.transaction = params.data;
    this.role = params.context.role;
    this.parentComponent = params.context.parentComponent as TransactionTableComponent;

    console.log('ActionsCellRenderer (refresh): Transaction ID:', this.transaction.id, 'Role:', this.role, 'Status:', this.transaction.status);
    this.updateButtonVisibility();
    return true;
  }

  private updateButtonVisibility(): void {
    const status = this.transaction.status;
    const isMaker = this.role === 'maker' || this.role === 'admin';
    const isChecker = this.role === 'checker' || this.role === 'admin';

    // Edit button: only for PENDING transactions by maker/admin
    this.showEdit = isMaker && status === 'PENDING';

    // Delete button: only for PENDING transactions by maker/admin
    this.showDelete = isMaker && status === 'PENDING'; 

    // Accept and Reject buttons: only for PENDING transactions by checker/admin
    this.showAccept = isChecker && status === 'PENDING';
    this.showReject = isChecker && status === 'PENDING';

    console.log(`ActionsCellRenderer: For ${this.transaction.id} (Status: ${status}, Role: ${this.role}) -> showEdit: ${this.showEdit}, showDelete: ${this.showDelete}, showAccept: ${this.showAccept}, showReject: ${this.showReject}`);
  }

  onEditClick(): void {
    if (this.parentComponent) {
      console.log('ActionsCellRenderer: Calling parentComponent.onEdit for', this.transaction.id);
      this.parentComponent.onEdit(this.transaction);
    }
  }

  onDeleteClick(): void {
    if (this.parentComponent) {
      console.log('ActionsCellRenderer: Calling parentComponent.onDelete for', this.transaction.id);
      this.parentComponent.onDelete(this.transaction.id);
    }
  }

  onAcceptClick(): void {
    if (this.parentComponent) {
      console.log('ActionsCellRenderer: Calling parentComponent.onAccept for', this.transaction.id);
      this.parentComponent.onAccept(this.transaction.id);
    }
  }

  onRejectClick(): void {
    if (this.parentComponent) {
      console.log('ActionsCellRenderer: Calling parentComponent.onReject for', this.transaction.id);
      this.parentComponent.onReject(this.transaction.id);
    }
  }
}