
import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { catchError, of, tap, forkJoin, Observable, finalize, concatMap } from 'rxjs';

import { GridApi } from 'ag-grid-community';

import { Transaction, FilterOptions } from '../interfaces/transaction.interface';

import { TransactionFormComponent } from '../form/form';
import { TransactionTableComponent } from '../ag-grid/ag-grid';
import { SidebarComponent } from '../sidebar/sidebar';
import { ConfirmationModalComponent } from '../shared/modals/confirmation-modal/confirmation';
import { RejectionReasonModalComponent } from '../shared/modals/rejection-modal/rejection-modal';


import { TransactionService } from '../services/service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TransactionFormComponent,
    TransactionTableComponent,
    SidebarComponent,
    ConfirmationModalComponent,
    RejectionReasonModalComponent
  ],
  providers: [DatePipe],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})

export class HomeComponent implements OnInit {
  http = inject(HttpClient);
  datePipe = inject(DatePipe);
  changeDetectorRef = inject(ChangeDetectorRef);
  
  private transactionService = inject(TransactionService);

  role: string | null = null;
  
  showAddForm = false;
  showEditForm = false;
  editingTransaction: Transaction | null = null;
  nextNewTransactionId: string = '';
  showConfirmModal = false;
  modalMessage = '';
  modalAction: (() => void) | null = null;
  massActionType: 'delete' | 'accept' | 'reject' | null = null;
  showReasonModal = false;
  currentTransactionForReasonId: string | null = null;
  transactionsToRejectIds: string[] = [];
  rejectionReasonInput: string = '';

  showSidebar = false;
  selectedTransaction: Transaction | null = null;
  sidebarActiveTab: 'overview' | 'history' | 'filter' = 'overview';

  transactionList: Transaction[] = [];

  agGridDisplayData: Transaction[] = [];

  searchTerm: string = '';
  activeTab: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'DELETED' = 'PENDING';
  filterOptions: FilterOptions = {
    referenceNo: '',
    transferFrom: '',
    transferTo: '',
    statuses: {
      PENDING: false,
      ACCEPTED: false,
      REJECTED: false,
      DELETED: false
    },
    dateRange: 'custom',
    fromDate: '',
    toDate: ''
  };
  currentFilterOptions: FilterOptions = { ...this.filterOptions };

  gridApi!: GridApi;

  selectedRowCount: number = 0;
  showMassActions: boolean = false;


  constructor() {}

  ngOnInit(): void {
    this.role = localStorage.getItem('role');
    this.loadTransactions();
  }

  private generateNextTransactionId(): string {
    const maxIdNum = this.transactionList.reduce((max, txn) => {
      const idNum = parseInt(txn.id.replace('T', ''), 10);
      return isNaN(idNum) ? max : Math.max(max, idNum);
    }, 0);
    return `T${maxIdNum + 1}`;
  }

  private loadTransactions(): void {
    this.transactionService.getTransactions()
      .pipe(
        tap(data => {
          this.transactionList = data;
          this.sortTransactionsByCreatedAt();
          this.updateGridDataAndFilters();
          this.nextNewTransactionId = this.generateNextTransactionId();
        }),
        catchError(err => {
          this.agGridDisplayData = [];
          return of([]);
        })
      )
      .subscribe();
  }

  private sortTransactionsByCreatedAt(): void {
    this.transactionList.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  updateGridDataAndFilters(): void {
    let filteredData = this.transactionList.filter(txn => txn.status === this.activeTab);

    if (this.searchTerm) {
      const lowerCaseSearchTerm = this.searchTerm.toLowerCase();
      filteredData = filteredData.filter(txn =>
        txn.id.toLowerCase().includes(lowerCaseSearchTerm) ||
        txn.fromAccount.toLowerCase().includes(lowerCaseSearchTerm) ||
        txn.toAccount.toLowerCase().includes(lowerCaseSearchTerm) ||
        txn.description.toLowerCase().includes(lowerCaseSearchTerm) ||
        txn.currency.toLowerCase().includes(lowerCaseSearchTerm) ||
        (txn.rejectionReason && txn.rejectionReason.toLowerCase().includes(lowerCaseSearchTerm))
      );
    }

    const selectedFilterStatuses = Object.keys(this.filterOptions.statuses).filter(key => this.filterOptions.statuses[key as keyof typeof this.filterOptions.statuses]);
    if (selectedFilterStatuses.length > 0) {
      if (!selectedFilterStatuses.includes(this.activeTab) || selectedFilterStatuses.length > 1) {
         filteredData = filteredData.filter(txn => selectedFilterStatuses.includes(txn.status));
      }
    }

    if (this.filterOptions.dateRange !== 'all') {
      let fromDate: Date | null = null;
      let toDate: Date | null = null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (this.filterOptions.dateRange === 'thisWeek') {
        const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        fromDate = firstDayOfWeek;
        toDate = new Date();
      } else if (this.filterOptions.dateRange === 'lastMonth') {
        const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        fromDate = firstDayOfLastMonth;
        toDate = lastDayOfLastMonth;
      } else if (this.filterOptions.dateRange === 'custom' && this.filterOptions.fromDate && this.filterOptions.toDate) {
        fromDate = new Date(this.filterOptions.fromDate);
        toDate = new Date(this.filterOptions.toDate);
        toDate.setHours(23, 59, 59, 999);
      }

      if (fromDate && toDate) {
        filteredData = filteredData.filter(txn => {
          const txnDate = txn.createdAt ? new Date(txn.createdAt) : null;
          return txnDate && txnDate >= fromDate && txnDate <= toDate;
        });
      }
    }

    this.agGridDisplayData = [...filteredData];

    if (this.gridApi) {
      this.gridApi.setGridOption('rowData', this.agGridDisplayData); 
      this.gridApi.paginationGoToFirstPage();
      this.changeDetectorRef.detectChanges();
    }
  }

  getTransactionsCountForTab(status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'DELETED'): number {
    return this.transactionList.filter(txn => txn.status === status).length;
  }

  selectTab(tabName: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'DELETED'): void {
    this.activeTab = tabName;
    this.clearFilterOptions();
    this.updateGridDataAndFilters();
  }

  toggleAddForm(): void {
    this.closeAllModalsAndSidebars();
    this.showAddForm = !this.showAddForm;
    this.nextNewTransactionId = this.generateNextTransactionId();
  }

  onSearchChange(searchTerm: string): void {
    this.searchTerm = searchTerm;
    this.updateGridDataAndFilters();
  }

  onEditClick(transaction: Transaction): void {
    this.editingTransaction = { ...transaction };
    this.showEditForm = true;
    this.closeAllModalsAndSidebars();
  }

  onTransactionAdded(newTxn: Transaction): void {
    this.transactionList.unshift(newTxn);
    this.sortTransactionsByCreatedAt();
    this.updateGridDataAndFilters();

    this.transactionService.addTransaction(newTxn)
      .pipe(
        tap((responseTxn) => {
          const index = this.transactionList.findIndex(t => t.id === newTxn.id);
          if (index !== -1) {
              this.transactionList[index] = responseTxn;
          }
          this.selectTab('PENDING');
        }),
        catchError(err => {
          const index = this.transactionList.findIndex(t => t.id === newTxn.id);
          if (index !== -1) {
              this.transactionList.splice(index, 1);
              this.updateGridDataAndFilters();
          }
          return of(null);
        })
      )
      .subscribe(() => {
        this.showAddForm = false;
      });
  }

  onTransactionUpdated(updatedTxn: Transaction): void {
    const index = this.transactionList.findIndex(t => t.id === updatedTxn.id);
    if (index !== -1) {
      const originalTxn = { ...this.transactionList[index] };

      this.transactionList[index] = updatedTxn;
      this.sortTransactionsByCreatedAt();
      this.updateGridDataAndFilters();

      this.transactionService.updateTransaction(updatedTxn)
        .pipe(
          tap((responseTxn) => {
            const updatedIndex = this.transactionList.findIndex(t => t.id === responseTxn.id);
            if(updatedIndex !== -1) {
                this.transactionList[updatedIndex] = responseTxn;
            }
            if (this.selectedTransaction?.id === responseTxn.id) {
              this.selectedTransaction = responseTxn;
            }
            this.sortTransactionsByCreatedAt();
            this.updateGridDataAndFilters();
          }),
          catchError(err => {
            this.transactionList[index] = originalTxn;
            this.loadTransactions();
            return of(null);
          })
        )
        .subscribe(() => {
          this.showEditForm = false;
          this.editingTransaction = null;
        });
    } else {
      this.showEditForm = false;
      this.editingTransaction = null;
    }
  }

  onTransactionFormCancel(): void {
    this.showAddForm = false;
    this.showEditForm = false;
    this.editingTransaction = null;
  }

  onGridApiReady(api: GridApi): void {
    this.gridApi = api;
    this.updateGridDataAndFilters();
  }

  onRowSelected(event: { selectedCount: number; selectedRows: Transaction[] }): void {
    this.selectedRowCount = event.selectedCount;
    this.showMassActions = event.selectedCount > 0;
    this.changeDetectorRef.detectChanges();
  }

  onRowClicked(transaction: Transaction): void {
    this.openSidebar(transaction);
  }

  confirmMassAction(actionType: 'delete' | 'accept' | 'reject', transactionIds?: string[]): void {
    const selectedTransactions = transactionIds ?
                                 this.transactionList.filter(txn => transactionIds.includes(txn.id)) :
                                 this.gridApi.getSelectedRows();
                                 
    if (selectedTransactions.length === 0) {
      return;
    }

    this.closeAllModalsAndSidebars();
    this.massActionType = actionType;

    const idsToActOn = selectedTransactions.map(txn => txn.id);
    const currentSelectedCount = selectedTransactions.length;
    const idList = idsToActOn.slice(0, 3).join(', ') + (idsToActOn.length > 3 ? '...' : '');

    let confirmationMessage = '';
    switch (actionType) {
      case 'delete':
        confirmationMessage = `Are you sure you want to delete ${currentSelectedCount} selected transactions (${idList})? This will move them to the 'Deleted' list.`;
        this.modalAction = () => this.callUpdateTransactionStatus(idsToActOn, 'DELETED');
        break;
      case 'accept':
        confirmationMessage = `Are you sure you want to ACCEPT ${currentSelectedCount} selected transactions (${idList})?`;
        this.modalAction = () => this.callUpdateTransactionStatus(idsToActOn, 'ACCEPTED');
        break;
      case 'reject':
        this.transactionsToRejectIds = idsToActOn;
        this.promptForRejectionReason(idsToActOn);
        return;
    }

    this.modalMessage = confirmationMessage;
    this.showConfirmModal = true;
    this.changeDetectorRef.detectChanges();
  }

  executeModalAction(): void {
    if (this.modalAction) {
      this.modalAction();
    }
  }

  promptForRejectionReason(transactionIds: string[]): void {
    this.closeAllModalsAndSidebars();
    this.currentTransactionForReasonId = transactionIds.length === 1 ? transactionIds[0] : null; 
    this.transactionsToRejectIds = transactionIds;
    this.massActionType = 'reject';
    this.rejectionReasonInput = '';
    this.showReasonModal = true;
    this.changeDetectorRef.detectChanges();
  }

  onRejectionReasonSubmitted(reason: string): void {
    this.rejectionReasonInput = reason;

    if (this.transactionsToRejectIds.length > 0) {
      this.callUpdateTransactionStatus(this.transactionsToRejectIds, 'REJECTED', reason);
    } else {
      if (this.currentTransactionForReasonId) {
        this.callUpdateTransactionStatus([this.currentTransactionForReasonId], 'REJECTED', reason);
      }
    }
  }

  onRejectionReasonCancel(): void {
    this.cancelRejectionReason();
  }

  callUpdateTransactionStatus(
    ids: string[],
    newStatus: 'ACCEPTED' | 'REJECTED' | 'DELETED',
    rejectionReason?: string
  ): void {
    const byUser = this.role || 'Unknown Checker';
    
    // Create a map to store original transactions for potential rollback
    const originalTransactionsMap = new Map<string, Transaction>();

    // Optimistically update UI
    ids.forEach(id => {
      const index = this.transactionList.findIndex(txn => txn.id === id);
      if (index !== -1) {
        originalTransactionsMap.set(id, { ...this.transactionList[index] }); // Store original

        const updatedTxn = { ...this.transactionList[index] }; // Create a mutable copy for optimistic update
        updatedTxn.status = newStatus;

        if (newStatus === 'ACCEPTED') {
          updatedTxn.acceptedAt = new Date().toISOString();
          updatedTxn.acceptedBy = byUser;
          delete updatedTxn.rejectedAt;
          delete updatedTxn.rejectionReason;
          delete updatedTxn.rejectedBy;
        } else if (newStatus === 'REJECTED') {
          updatedTxn.rejectedAt = new Date().toISOString();
          updatedTxn.rejectedBy = byUser;
          updatedTxn.rejectionReason = rejectionReason;
          delete updatedTxn.acceptedAt;
          delete updatedTxn.acceptedBy;
        } else { // DELETED
          delete updatedTxn.acceptedAt;
          delete updatedTxn.acceptedBy;
          delete updatedTxn.rejectedAt;
          delete updatedTxn.rejectionReason;
          delete updatedTxn.rejectedBy;
        }
        this.transactionList[index] = updatedTxn; // Apply optimistic update
      }
    });

    this.sortTransactionsByCreatedAt();
    this.updateGridDataAndFilters();

    const updateObservables: Observable<Transaction>[] = ids.map(id => {
      if (newStatus === 'DELETED') {
        return this.transactionService.deleteTransaction(id, byUser);
      } else {
        return this.transactionService.updateTransactionStatus(id, newStatus, rejectionReason, byUser);
      }
    });

    forkJoin(updateObservables)
      .pipe(
        tap((responses: Transaction[]) => {
          responses.forEach(responseTxn => {
            const index = this.transactionList.findIndex(t => t.id === responseTxn.id);
            if (index !== -1) {
              this.transactionList[index] = responseTxn; // Update with actual backend response
            }
          });
          this.sortTransactionsByCreatedAt();
          this.updateGridDataAndFilters();
          this.closeConfirmModal();
          this.cancelRejectionReason();
        }),
        finalize(() => {
          this.gridApi?.deselectAll();
          this.selectedRowCount = 0;
          this.showMassActions = false;
          this.changeDetectorRef.detectChanges();
        }),
        catchError(err => {
          ids.forEach(id => {
            const index = this.transactionList.findIndex(txn => txn.id === id);
            const originalTxn = originalTransactionsMap.get(id);
            if (index !== -1 && originalTxn) {
              this.transactionList[index] = originalTxn; // Rollback
            }
          });
          this.loadTransactions(); // Re-fetch to ensure data consistency after error
          return of(null);
        })
      )
      .subscribe();
  }

  openSidebar(txn?: Transaction): void {
    this.closeAllModalsAndSidebars();
    this.showSidebar = true;
    this.selectedTransaction = txn || null;
    this.sidebarActiveTab = txn ? 'overview' : 'filter';
    this.currentFilterOptions = { ...this.filterOptions };
    this.changeDetectorRef.detectChanges();
  }

  onSidebarClose(): void {
    this.closeSidebar();
  }

  onSidebarTabChange(tab: 'overview' | 'history' | 'filter'): void {
    this.sidebarActiveTab = tab;
  }

  onFilterOptionsApplied(filters: FilterOptions): void {
    this.filterOptions = { ...filters };
    this.updateGridDataAndFilters();
    this.closeSidebar();
  }

  onFilterOptionsCleared(): void {
    this.clearFilterOptions();
    this.closeSidebar();
  }

  private clearFilterOptions(): void {
    this.filterOptions = {
      referenceNo: '',
      transferFrom: '',
      transferTo: '',
      statuses: { PENDING: false, ACCEPTED: false, REJECTED: false, DELETED: false },
      dateRange: 'custom',
      fromDate: '',
      toDate: ''
    };
    this.currentFilterOptions = { ...this.filterOptions };
    this.searchTerm = '';
  }

  closeConfirmModal(): void {
    this.showConfirmModal = false;
    this.modalMessage = '';
    this.modalAction = null;
    this.massActionType = null;
    this.changeDetectorRef.detectChanges();
  }

  cancelRejectionReason(): void {
    this.showReasonModal = false;
    this.currentTransactionForReasonId = null;
    this.transactionsToRejectIds = [];
    this.rejectionReasonInput = '';
    this.massActionType = null;
    this.changeDetectorRef.detectChanges();
  }

  closeSidebar(): void {
    this.showSidebar = false;
    this.selectedTransaction = null;
    this.sidebarActiveTab = 'overview';
    this.gridApi?.deselectAll();
    this.selectedRowCount = 0;
    this.showMassActions = false;
    this.changeDetectorRef.detectChanges();
  }

  closeAllModalsAndSidebars(): void {
    this.showAddForm = false;
    this.showEditForm = false;
    this.showConfirmModal = false;
    this.showReasonModal = false;
    this.showSidebar = false;
    this.selectedTransaction = null;
    this.sidebarActiveTab = 'overview';
    this.gridApi?.deselectAll();
    this.selectedRowCount = 0;
    this.showMassActions = false;
    this.changeDetectorRef.detectChanges();
  }
}