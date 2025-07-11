import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { catchError, of, tap, forkJoin, Observable, finalize } from 'rxjs';

import { GridApi } from 'ag-grid-community';

import { Transaction, FilterOptions } from '../interfaces/transaction.interface';

import { TransactionFormComponent } from '../form/form';
import { TransactionTableComponent } from '../ag-grid/ag-grid';
import { SidebarComponent } from '../sidebar/sidebar';
import { ConfirmationModalComponent } from '../shared/modals/confirmation-modal/confirmation';
import { RejectionReasonModalComponent } from '../shared/modals/rejection-modal/rejection-modal';

import { TransactionService } from '../services/service'; // Corrected import path

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
  datePipe = inject(DatePipe);
  changeDetectorRef = inject(ChangeDetectorRef);

  private transactionService = inject(TransactionService);

  role: string | null = null;

  showAddForm = false;
  showEditForm = false;
  editingTransaction: Transaction | null = null;
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
  accountNumbers: string[] = []; // This array will hold the fetched account numbers

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

  constructor() { }

  ngOnInit(): void {
    this.role = localStorage.getItem('role');
    this.loadTransactions();
    this.loadAccountNumbers(); // Ensure this method is called here
  }

  private loadAccountNumbers(): void {
    console.log('HomeComponent: Attempting to load account numbers...'); // Debug log
    this.transactionService.getAccountNumbers()
      .pipe(
        tap(data => {
          this.accountNumbers = data;
          console.log('HomeComponent: Fetched Account Numbers:', this.accountNumbers); // Debug log
          this.changeDetectorRef.detectChanges(); // Manually trigger change detection if needed
        }),
        catchError(err => {
          console.error('HomeComponent: Error loading account numbers:', err); // Debug error log
          return of([]);
        })
      )
      .subscribe();
  }

  private loadTransactions(): void {
    this.transactionService.getTransactions()
      .pipe(
        tap(data => {
          this.transactionList = data;
          this.sortTransactionsByCreatedAt();
          this.updateGridDataAndFilters();
        }),
        catchError(err => {
          console.error('Error loading transactions:', err);
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
        txn.id?.toLowerCase().includes(lowerCaseSearchTerm) ||
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
        const firstDayOfWeek = new Date(today);
        firstDayOfWeek.setDate(today.getDate() - today.getDay());
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
    this.changeDetectorRef.detectChanges();
  }

  onSearchChange(searchTerm: string): void {
    this.searchTerm = searchTerm;
    this.updateGridDataAndFilters();
  }

  onEditClick(transaction: Transaction): void {
    this.closeAllModalsAndSidebars();
    this.editingTransaction = { ...transaction };
    this.showEditForm = true;
    this.changeDetectorRef.detectChanges();
  }

  onTransactionAdded(newTxn: Transaction): void {
    this.loadTransactions();
    this.selectTab('PENDING');
    this.showAddForm = false;
    this.changeDetectorRef.detectChanges();
  }

  onTransactionUpdated(updatedTxn: Transaction): void {
    if (!updatedTxn._id) {
      console.error('HomeComponent: Cannot update transaction, _id is missing.', updatedTxn);
      return;
    }
    this.transactionService.updateTransaction(updatedTxn)
      .pipe(
        tap((responseTxn) => {
          this.loadTransactions();
          if (this.selectedTransaction?._id === responseTxn._id) {
            this.selectedTransaction = responseTxn;
          }
        }),
        catchError(err => {
          console.error('Error updating transaction:', err);
          this.loadTransactions();
          return of(null);
        })
      )
      .subscribe(() => {
        this.showEditForm = false;
        this.editingTransaction = null;
        this.changeDetectorRef.detectChanges();
      });
  }

  onTransactionFormCancel(): void {
    this.showAddForm = false;
    this.showEditForm = false;
    this.editingTransaction = null;
    this.changeDetectorRef.detectChanges();
  }

  onGridApiReady(api: GridApi): void {
    this.gridApi = api;
    this.updateGridDataAndFilters();
  }

  onRowSelected(event: { selectedCount: number; selectedRows: Transaction[] }): void {
    this.selectedRowCount = event.selectedCount;
    this.showMassActions = event.selectedCount > 1;
    this.changeDetectorRef.detectChanges();
  }

  onRowClicked(transaction: Transaction): void {
    this.openSidebar(transaction);
  }

  confirmMassAction(actionType: 'delete' | 'accept' | 'reject', transactionIds?: string[]): void {
    const selectedTransactions = transactionIds ?
      this.transactionList.filter(txn => transactionIds.includes(txn._id as string)) :
      this.gridApi.getSelectedRows();

    if (selectedTransactions.length === 0) {
      return;
    }

    this.closeAllModalsAndSidebars();
    this.massActionType = actionType;

    const idsToActOn = selectedTransactions.map(txn => txn._id as string);
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
    this.closeConfirmModal();
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
    this.cancelRejectionReason();
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

    const updateObservables: Observable<Transaction>[] = ids.map(_id => {
      if (newStatus === 'DELETED') {
        return this.transactionService.deleteTransaction(_id, byUser);
      } else {
        return this.transactionService.updateTransactionStatus(_id, newStatus, rejectionReason, byUser);
      }
    });

    forkJoin(updateObservables)
      .pipe(
        tap(() => {
          this.loadTransactions();
        }),
        finalize(() => {
          this.gridApi?.deselectAll();
          this.selectedRowCount = 0;
          this.showMassActions = false;
          this.changeDetectorRef.detectChanges();
          this.closeConfirmModal();
          this.cancelRejectionReason();
        }),
        catchError(err => {
          console.error('Error performing mass action:', err);
          this.loadTransactions();
          return of(null);
        })
      )
      .subscribe(() => {
        // This empty subscribe callback is fine, the important logic is in tap and finalize.
        // However, if you want to ensure the modal closes immediately after the subscription completes
        // (which is already handled by finalize, but for clarity or if finalize was not used),
        // you could put it here. Given the current structure, finalize is better.
      });
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
