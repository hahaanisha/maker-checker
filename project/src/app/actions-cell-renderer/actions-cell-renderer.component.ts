import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { Transaction } from '../interfaces/transaction.interface';
import { TransactionTableComponent } from '../ag-grid/ag-grid';

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
  isMenuOpen = false;

  @ViewChild('menuContainer', { static: false }) menuContainer!: ElementRef;

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

  toggleMenu(event: Event): void {
    event.stopPropagation();
    this.isMenuOpen = !this.isMenuOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (
      this.menuContainer &&
      this.menuContainer.nativeElement &&
      !this.menuContainer.nativeElement.contains(event.target)
    ) {
      this.isMenuOpen = false;
    }
  }

  onEditClick(event: Event): void {
    event.stopPropagation();
    this.isMenuOpen = false;
    this.parentComponent?.onEdit(this.transaction);
  }

  onDeleteClick(event: Event): void {
    event.stopPropagation();
    this.isMenuOpen = false;
    this.parentComponent?.onDelete(this.transaction._id as string);
  }

  onAcceptClick(event: Event): void {
    event.stopPropagation();
    this.isMenuOpen = false;
    this.parentComponent?.onAccept(this.transaction._id as string);
  }

  onRejectClick(event: Event): void {
    event.stopPropagation();
    this.isMenuOpen = false;
    this.parentComponent?.onReject(this.transaction._id as string);
  }

  hasAnyActions(): boolean {
    return this.showEdit || this.showDelete || this.showAccept || this.showReject;
  }
}
