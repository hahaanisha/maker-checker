// src/app/home/home.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';
// AG Grid Imports
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridOptions, RowClickedEvent, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';


import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
// Custom Cell Renderers
import { StatusCellRendererComponent } from '../status-cell-renderer/status-cell-renderer.component';
import { ActionsCellRendererComponent } from '../actions-cell-renderer/actions-cell-renderer.component';

// WORKAROUND: Dummy variables to reference the components to suppress "not used" warnings (TS-998113)
const _ = [StatusCellRendererComponent, ActionsCellRendererComponent];


// Register AG Grid Modules here, before any grid instances are created.
// This is crucial for the grid to function.
ModuleRegistry.registerModules([AllCommunityModule]);


interface Transaction {
  id: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  currency: string;
  description: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'DELETED';
  rejectionReason?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  createdAt?: string;
  createdBy?: string;
  acceptedBy?: string;
  rejectedBy?: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AgGridAngular,
    StatusCellRendererComponent,
    ActionsCellRendererComponent
  ],
  providers: [DatePipe],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class HomeComponent implements OnInit {
  http = inject(HttpClient);
  datePipe = inject(DatePipe);

  private apiUrl = 'http://localhost:3000/api/transactions';

  role: string | null = null;
  showAddForm = false;
  showEditForm = false;
  editingTransaction: Transaction | null = null;

  transactionList: Transaction[] = []; // Master list from backend

  searchTerm: string = '';

  activeTab: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'DELETED' = 'PENDING';

  showConfirmModal = false;
  modalMessage = '';
  modalAction: (() => void) | null = null;
  // --- NEW: State for mass action confirmation type ---
  massActionType: 'delete' | 'accept' | 'reject' | null = null;

  showReasonModal = false;
  // --- MODIFIED: currentTransactionForReasonId can be a string (single) or null (mass) ---
  currentTransactionForReasonId: string | null = null;
  rejectionReasonInput: string = '';

  showSidebar = false;
  selectedTransaction: Transaction | null = null;
  sidebarActiveTab: 'overview' | 'history' | 'filter' = 'overview';

  filterOptions = {
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

  currentFilterOptions = { ...this.filterOptions };

  gridApi!: GridApi; // Declared with definite assignment assertion !
  public agGridDisplayData: Transaction[] = []; // This holds the filtered data for AG Grid

  // --- NEW: State for selected row count and mass action button visibility ---
  selectedRowCount: number = 0;
  showMassActions: boolean = false;


  gridOptions: GridOptions = {
    domLayout: 'autoHeight',
    pagination: true,
    paginationPageSize: 4,
    suppressCellFocus: true,
    paginationPageSizeSelector:false,

    // suppressPaginationPanel: true, // User's original comment, keeping it commented out for clarity
    suppressPaginationPanel: true, // Hides AG Grid's built-in pagination UI
    
    // --- NEW: Increased Row Height (from user's snippet, keeping original value) ---
    rowHeight: 45, // Set desired row height in pixels
    components: { // Register custom cell renderers by their string alias
      statusCellRenderer: StatusCellRendererComponent,
      actionsCellRenderer: ActionsCellRendererComponent,
    },
    context: {
      parentComponent: this,
      role: this.role
    },
   
    rowSelection: 'multiple', 
    suppressRowClickSelection: true, 
    onSelectionChanged: (params) => {
      if (this.gridApi) {
        this.selectedRowCount = this.gridApi.getSelectedRows().length;
        this.showMassActions = this.selectedRowCount > 0; 
      }
    },
    onRowClicked: (event: RowClickedEvent) => {
      // Only open sidebar if the click was not on an action button or selection checkbox
      if (event.data && event.event?.target &&
          !(event.event.target as HTMLElement).closest('.action-buttons') &&
          !(event.event.target as HTMLElement).closest('.ag-selection-checkbox')) { // Exclude clicks on checkbox
        this.openSidebar(event.data);
      }
    },
    onGridReady: (params) => {
        this.gridApi = params.api;
        console.log('AG Grid is ready. (onGridReady)');
        console.log('Grid API object:', this.gridApi);
        if (this.transactionList.length > 0) {
          console.log('Grid ready and transactions already loaded. Calling updateGridDataAndFilters.');
          this.updateGridDataAndFilters();
        } else {
          console.warn('Grid ready, but transactions not yet loaded. Waiting for loadTransactions to complete.');
        }
    },
    onFirstDataRendered: (params) => {
        console.log('AG Grid: First Data Rendered Event fired!');
        console.log('  Rows displayed by AG Grid:', params.api.getDisplayedRowCount());
        params.api.sizeColumnsToFit();
        console.log('  Columns sized to fit.');
    },
    onGridSizeChanged: (params) => {
        console.log('AG Grid: Grid Size Changed Event fired!');
        console.log('  Container Width:', params.clientWidth, 'Container Height:', params.clientHeight);
        if (this.gridApi) {
            this.gridApi.sizeColumnsToFit();
        }
    },
    defaultColDef: {
      sortable: true,
      filter: false, // --- NEW: Disabled filter by default for all columns (from user's snippet) ---
      resizable: true,
      flex: 1,
      minWidth: 100,
    }
  };

  // --- REMOVED: rowSelection property moved into gridOptions. This was causing a duplicate definition. ---
  // rowSelection: RowSelectionOptions | "single" | "multiple" = {
  //   mode: "multiRow",
  //   headerCheckbox: false,
  // };


public columnDefs: ColDef[] = [
  // --- NEW: Checkbox selection column for multi-row selection with header checkbox ---
  {
    headerName: '', // Empty header for checkbox column
    checkboxSelection: true, // Enables checkbox for row selection
    headerCheckboxSelection: true, // --- NEW: Enables "select all" checkbox in the header ---
    width: 40,
    minWidth: 40,
    maxWidth: 40,
    resizable: false,
    sortable: false,
    filter: false,
    // --- FIX: Changed 'suppressMenu' to 'suppressColumnsToolPanel' to resolve type error ---
    suppressColumnsToolPanel: true, // Hides column menu for this column (prevents type error)
    suppressNavigable: true, // Prevents keyboard navigation into this cell
    lockPosition: true // Keeps this column fixed in place
  },
  {
    headerName: 'ID',
    field: 'id',
    minWidth: 120,
    // --- MODIFIED: Inline cellRenderer for ID and Reference Number ---
    cellRenderer: (params: { data: { id: string; }; value: string; }) => {
      // Use params.value for the main ID (which is 'id' field).
      // For 'refId', since it's not a direct field in Transaction interface,
      // we'll derive a simplified 'reference number' from the ID itself.
      const mainId = params.value;
      const referenceNum = `Ref: ${mainId.substring(0, 8)}...`; // Example: "Ref: T171829..."
      return `
        <div style="display: flex; flex-direction: column; justify-content: center; height: 100%; padding-left: 10px;">
          <div style="font-weight: 500; color: #333; line-height: 1.2;">${mainId}</div>
          <div style="font-size: 0.8em; color: gray; line-height: 1.2; margin-top: 2px;">${referenceNum}</div>
        </div>
      `;
    },
    autoHeight: true, // Allows cell to expand vertically for multi-line content
    cellStyle: { cursor: 'pointer', 'white-space': 'normal' } // Allows text to wrap
  },
  { headerName: 'From (Account)', field: 'fromAccount', cellStyle: { cursor: 'pointer' } },
  { headerName: 'To (Account)', field: 'toAccount', cellStyle: { cursor: 'pointer' } },
  {
    headerName: 'Amount',
    field: 'amount',
    type: 'numericColumn',
    // --- MODIFIED: Inline cellRenderer for Amount and Currency ---
    cellRenderer: (params: { value: number | null; data: { currency: string; }; }) => {
      const formattedAmount = params.value != null ? params.value.toFixed(2) : '-';
      const currency = params.data.currency || '-';
      return `
        <div style="display: flex; flex-direction: column; justify-content: center; height: 100%; padding-right: 10px; text-align: right;">
          <div style="font-weight: 500; color: #333; line-height: 1.2;">${formattedAmount}</div>
          <div style="font-size: 0.8em; color: gray; line-height: 1.2; margin-top: 2px;">${currency}</div>
        </div>
      `;
    },
    autoHeight: true, // Allows cell to expand vertically for multi-line content
    cellStyle: { cursor: 'pointer', 'white-space': 'normal', 'text-align': 'right' } // Align content to the right
  },
  // --- REMOVED: Currency column is now part of Amount column's cellRenderer ---
  // { headerName: 'Currency', field: 'currency', cellStyle: { cursor: 'pointer' }, minWidth: 100 },
  { headerName: 'Description', field: 'description', cellStyle: { cursor: 'pointer' } },
  {
    headerName: 'Status',
    field: 'status',
    cellRenderer: 'statusCellRenderer',
    cellStyle: { cursor: 'pointer' },
    minWidth: 120
  },
  {
    headerName: 'Reason',
    field: 'rejectionReason',
    cellStyle: { cursor: 'pointer' },
    valueGetter: (params) => params.data.rejectionReason || '-'
  },
  {
    headerName: 'Actions',
    cellRenderer: 'actionsCellRenderer',
    minWidth: 180,
    maxWidth: 200,
    sortable: false,
    filter: false,
    resizable: false,
    cellClass: 'ag-grid-action-cell',
    suppressColumnsToolPanel: true,
    suppressMovable: true,
    lockPosition: true
  }
];

  constructor() {}

  ngOnInit(): void {
    this.role = localStorage.getItem('role');
    this.gridOptions.context!.role = this.role;
    console.log('HomeComponent initialized. Role:', this.role);
    this.loadTransactions();
  }

  private loadTransactions(): void {
    console.log(`Attempting to load transactions from: ${this.apiUrl}`);
    this.http.get<Transaction[]>(this.apiUrl)
      .pipe(
        tap(data => {
          console.log('Transactions received from backend:', data);
          if (data.length === 0) {
            console.warn('Backend returned an empty array. No transactions to display.');
          }
          this.transactionList = data;
          this.sortTransactionsByCreatedAt();
          if (this.gridApi) {
            console.log('Transactions loaded and Grid API is ready. Calling updateGridDataAndFilters.');
            this.updateGridDataAndFilters();
          } else {
            console.warn('Transactions loaded, but Grid API not yet ready. Will update when gridReady fires.');
          }
        }),
        catchError(err => {
          console.error('Error loading transactions from backend:', err);
          if (err.status) {
            console.error(`Status: ${err.status}, Message: ${err.message}`);
          }
          if (err.error) {
            console.error('Backend Error Response:', err.error);
          }
          this.agGridDisplayData = []; // Clear grid data on error
          console.log('Error loading transactions. agGridDisplayData set to empty array.');
          return of([]);
        })
      )
      .subscribe();
  }

  /**
   * Sorts the transactionList by createdAt in descending order (latest first).
   */
  private sortTransactionsByCreatedAt(): void {
    this.transactionList.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  /**
   * Applies all active filters (tab status, search term, and new filter options)
   * to the `transactionList` and updates the `agGridDisplayData` property.
   * This property is then bound to AG Grid.
   */
  updateGridDataAndFilters(): void {
    console.log('--- updateGridDataAndFilters called ---');
    console.log('  Current activeTab:', this.activeTab);
    console.log('  Current searchTerm:', this.searchTerm);
    console.log('  Master transactionList length (before filter):', this.transactionList.length);

    // Ensure transactionList is not empty before filtering
    if (this.transactionList.length === 0) {
      this.agGridDisplayData = [];
      console.log('  transactionList is empty. agGridDisplayData set to empty array.');
      // --- NEW: Reset selected row count and mass actions if data becomes empty ---
      this.selectedRowCount = 0;
      this.showMassActions = false;
      return;
    }

    let filteredData = this.transactionList.filter(txn => txn.status === this.activeTab);
    console.log(`  After activeTab filter ('${this.activeTab}'), filteredData length:`, filteredData.length);

    // Apply global search term
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
      console.log(`  After search term ('${this.searchTerm}'), filteredData length:`, filteredData.length);
    }

    // Apply sidebar filter options
    if (this.filterOptions.referenceNo) {
      filteredData = filteredData.filter(txn => txn.id.toLowerCase().includes(this.filterOptions.referenceNo.toLowerCase()));
      console.log(`  After referenceNo filter, filteredData length:`, filteredData.length);
    }
    if (this.filterOptions.transferFrom) {
      filteredData = filteredData.filter(txn => txn.fromAccount.toLowerCase().includes(this.filterOptions.transferFrom.toLowerCase()));
      console.log(`  After transferFrom filter, filteredData length:`, filteredData.length);
    }
    if (this.filterOptions.transferTo) {
      filteredData = filteredData.filter(txn => txn.toAccount.toLowerCase().includes(this.filterOptions.transferTo.toLowerCase()));
      console.log(`  After transferTo filter, filteredData length:`, filteredData.length);
    }

    const selectedFilterStatuses = Object.keys(this.filterOptions.statuses).filter(key => this.filterOptions.statuses[key as keyof typeof this.filterOptions.statuses]);
    if (selectedFilterStatuses.length > 0) {
      if (!selectedFilterStatuses.includes(this.activeTab) || selectedFilterStatuses.length > 1) {
         filteredData = filteredData.filter(txn => selectedFilterStatuses.includes(txn.status));
      }
      console.log(`  After sidebar status filter, filteredData length:`, filteredData.length);
    }


    // Date filtering
    if (this.filterOptions.dateRange !== 'all') {
      let fromDate: Date | null = null;
      let toDate: Date | null = null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (this.filterOptions.dateRange === 'thisWeek') {
        const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        this.currentFilterOptions.fromDate = this.datePipe.transform(firstDayOfWeek, 'yyyy-MM-dd') || ''; // Corrected
        this.currentFilterOptions.toDate = this.datePipe.transform(new Date(), 'yyyy-MM-dd') || ''; // Corrected
        fromDate = firstDayOfWeek;
        toDate = new Date(); // Today
      } else if (this.filterOptions.dateRange === 'lastMonth') {
        const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        this.currentFilterOptions.fromDate = this.datePipe.transform(firstDayOfLastMonth, 'yyyy-MM-dd') || ''; // Corrected
        this.currentFilterOptions.toDate = this.datePipe.transform(lastDayOfLastMonth, 'yyyy-MM-dd') || ''; // Corrected
        fromDate = firstDayOfLastMonth;
        toDate = lastDayOfLastMonth;
      } else if (this.filterOptions.dateRange === 'custom' && this.filterOptions.fromDate && this.filterOptions.toDate) {
        fromDate = new Date(this.filterOptions.fromDate);
        toDate = new Date(this.filterOptions.toDate);
        toDate.setHours(23, 59, 59, 999); // Set to end of day
      }

      if (fromDate && toDate) {
        filteredData = filteredData.filter(txn => {
          const txnDate = txn.createdAt ? new Date(txn.createdAt) : null;
          return txnDate && txnDate >= fromDate && txnDate <= toDate;
        });
        console.log(`  After date range filter (${this.filterOptions.dateRange}), filteredData length:`, filteredData.length);
      }
    }

    // Assign the filtered data to the property bound by AG Grid
    this.agGridDisplayData = [...filteredData]; // Use spread to ensure a new array reference for change detection
    console.log('  Final agGridDisplayData assigned. Length:', this.agGridDisplayData.length, 'Data:', this.agGridDisplayData);

    // Reset AG Grid pagination to first page after data change
    if (this.gridApi) {
      this.gridApi.paginationGoToFirstPage();
      // --- NEW: After updating data, clear any existing row selections ---
      this.gridApi.deselectAll();
      this.selectedRowCount = 0;
      this.showMassActions = false;
      console.log('  AG Grid pagination reset to first page and selections cleared.');
    }
    console.log('--- updateGridDataAndFilters finished ---');
  }


  getTransactionsCountForTab(status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'DELETED'): number {
    return this.transactionList.filter(txn => txn.status === status).length;
  }

  // This method is not actually used for grid data directly due to AG Grid's internal pagination/filtering
  getPaginatedAndFilteredTransactions(): Transaction[] {
    return [];
  }

  get totalPages(): number {
    return this.gridApi ? this.gridApi.paginationGetTotalPages() : 1;
  }

  get currentPageNumber(): number {
    return this.gridApi ? this.gridApi.paginationGetCurrentPage() + 1 : 1;
  }

  // --- NEW: Generate page numbers for custom pagination display ---
  getPaginationPageNumbers(): number[] {
    if (!this.gridApi) {
      return [];
    }
    const totalPages = this.totalPages;
    const currentPage = this.currentPageNumber;
    const maxPagesToShow = 5; // e.g., show up to 5 page numbers (e.g., 1 2 3 4 5 or ...3 4 5 6 7...)
    const pages: number[] = [];

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
      let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

      // Adjust startPage if endPage goes beyond totalPages
      if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }

      // Add first page and ellipsis if not near the beginning
      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) pages.push(-1); // -1 signifies ellipsis
      }

      // Add the core page numbers
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      // Add ellipsis and last page if not near the end
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) pages.push(-1); // -1 signifies ellipsis
        pages.push(totalPages);
      }
    }
    return pages;
  }


  goToPage(page: number): void {
    if (this.gridApi) {
      this.gridApi.paginationGoToPage(page - 1);
    }
  }

  nextPage(): void {
    if (this.gridApi) {
      this.gridApi.paginationGoToNextPage();
    }
  }

  prevPage(): void {
    if (this.gridApi) {
      this.gridApi.paginationGoToPreviousPage();
    }
  }


  onSearchChange(searchTerm: string): void {
    this.searchTerm = searchTerm;
    this.updateGridDataAndFilters();
  }

  selectTab(tabName: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'DELETED'): void {
    this.activeTab = tabName;
    this.clearFilterOptions(); // Clear sidebar filters when changing main tabs
    this.updateGridDataAndFilters();
  }

  toggleAddForm(): void {
    if (this.showAddForm) {
      this.showAddForm = false;
    } else {
      this.showAddForm = true;
      this.showEditForm = false; // Ensure other forms are closed
      this.editingTransaction = null;
      this.showConfirmModal = false;
      this.showReasonModal = false;
      this.showSidebar = false;
      this.selectedTransaction = null;
      this.sidebarActiveTab = 'overview';
    }
  }

  addTransaction(form: NgForm): void {
    if (form.valid) {
      // Create a temporary ID for immediate UI update
      const newTxnData: Transaction = {
        id: 'T' + Date.now(),
        fromAccount: form.value.fromAccount,
        toAccount: form.value.toAccount,
        amount: form.value.amount,
        currency: form.value.currency,
        description: form.value.description,
        createdBy: this.role || 'Unknown Maker',
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };

      // Optimistic UI update: add to local list immediately
      this.transactionList.unshift(newTxnData);
      this.sortTransactionsByCreatedAt();
      this.updateGridDataAndFilters(); // Refresh grid with new item

      // Send to backend
      this.http.post<Transaction>(this.apiUrl, newTxnData)
        .pipe(
          tap((responseTxn) => {
            // Update the local list with the backend's confirmed transaction (e.g., if ID changes)
            const index = this.transactionList.findIndex(t => t.id === newTxnData.id);
            if (index !== -1) {
                this.transactionList[index] = responseTxn;
            }
            console.log('Transaction added via backend (server confirmed):', responseTxn);
            this.selectTab('PENDING'); // Go to pending tab to see the new transaction
          }),
          catchError(err => {
            console.error('Error adding transaction to backend:', err);
            // Revert UI if backend failed
            const index = this.transactionList.findIndex(t => t.id === newTxnData.id);
            if (index !== -1) {
                this.transactionList.splice(index, 1);
                this.updateGridDataAndFilters();
            }
            return of(null); // Return empty observable to keep the stream alive
          })
        )
        .subscribe();

      this.showAddForm = false;
      form.resetForm();
    }
  }

  onEditClick(transaction: Transaction): void {
    this.editingTransaction = { ...transaction }; // Create a copy to avoid direct mutation
    this.showEditForm = true;
    this.showAddForm = false; // Close add form
    this.closeAllModalsAndSidebars(); // Close all other modals/sidebars
  }

  cancelEdit(): void {
    this.editingTransaction = null;
    this.showEditForm = false;
  }

  updateTransaction(form: NgForm): void {
    if (form.valid && this.editingTransaction) {
      const updatedData = form.value;
      const transactionId = updatedData.id;

      const txnToUpdate: Transaction = {
          ...this.editingTransaction, // Keep original properties not in form
          ...updatedData, // Overlay with form values
          id: transactionId // Ensure ID is maintained
      };

      const index = this.transactionList.findIndex(t => t.id === transactionId);
      if (index !== -1) {
        const originalTxn = { ...this.transactionList[index] }; // Save original for rollback

        // Optimistic UI update
        this.transactionList[index] = txnToUpdate;
        this.updateGridDataAndFilters();

        this.http.put<Transaction>(`${this.apiUrl}/${transactionId}`, txnToUpdate)
          .pipe(
            tap((responseTxn) => {
              console.log('Transaction updated via backend:', responseTxn);
              // Update with server's response (may contain timestamps etc.)
              const updatedIndex = this.transactionList.findIndex(t => t.id === responseTxn.id);
              if(updatedIndex !== -1) {
                  this.transactionList[updatedIndex] = responseTxn;
              }
              // If sidebar is open for this transaction, update its data
              if (this.selectedTransaction?.id === responseTxn.id) {
                this.selectedTransaction = responseTxn;
              }
              this.sortTransactionsByCreatedAt();
              this.updateGridDataAndFilters(); // Refresh grid
            }),
            catchError(err => {
              console.error('Error updating transaction in backend:', err);
              // Rollback UI on error
              this.transactionList[index] = originalTxn;
              this.loadTransactions(); // Re-fetch to ensure data consistency
              return of(null);
            })
          )
          .subscribe(() => {
            this.cancelEdit(); // Close edit form after successful update
          });
      } else {
        console.warn('Transaction not found for update:', transactionId);
        this.cancelEdit();
      }
    }
  }

  // --- MODIFIED: General confirmation for single actions (now distinct from mass action confirmation) ---
  confirmAction(actionType: 'delete' | 'accept' | 'reject', transactionId: string): void {
    const txn = this.transactionList.find(t => t.id === transactionId);
    if (!txn) return;

    this.closeAllModalsAndSidebars(); // Close any open forms/sidebars first

    switch (actionType) {
      case 'delete':
        this.modalMessage = `Are you sure you want to delete transaction ID: ${transactionId}? This will move it to the 'Deleted' list.`;
        this.modalAction = () => this.deleteTransaction(transactionId);
        break;
      case 'accept':
        this.modalMessage = `Are you sure you want to ACCEPT transaction ID: ${transactionId}?`;
        this.modalAction = () => this.updateTransactionStatus(transactionId, 'ACCEPTED', undefined, this.role || 'Unknown Checker');
        break;
      default: // This 'default' now only catches unexpected cases, rejection is handled separately
        return;
    }
    this.showConfirmModal = true;
  }

  executeModalAction(): void {
    if (this.modalAction) {
      this.modalAction();
    }
    this.closeConfirmModal();
  }

  closeConfirmModal(): void {
    this.showConfirmModal = false;
    this.modalMessage = '';
    this.modalAction = null;
    this.massActionType = null; // --- NEW: Clear mass action type on close ---
  }

  deleteTransaction(id: string): void {
    // Delegates to updateTransactionStatus with 'DELETED' status
    this.updateTransactionStatus(id, 'DELETED');
  }

  // --- MODIFIED: promptForRejectionReason can now handle single string ID or an array of string IDs ---
  promptForRejectionReason(transactionIds: string | string[]): void {
    this.closeAllModalsAndSidebars();
    // If a single ID is passed, set currentTransactionForReasonId. If array, set to null (for bulk).
    this.currentTransactionForReasonId = Array.isArray(transactionIds) ? null : (transactionIds as string);
    this.rejectionReasonInput = ''; // Clear previous reason
    this.showReasonModal = true;
    if (Array.isArray(transactionIds)) {
      this.massActionType = 'reject'; // Indicate this is a mass reject operation
    }
  }

  submitRejectionReason(): void {
    if (this.rejectionReasonInput.trim() === '') {
      console.warn('Rejection reason is required.');
      return;
    }

    // Check if this is a mass rejection based on massActionType
    if (this.massActionType === 'reject') {
      this.executeMassAction('reject'); // Call mass action handler if it's a mass reject
    } else if (this.currentTransactionForReasonId) { // Else, it's a single rejection
      this.updateTransactionStatus(
        this.currentTransactionForReasonId,
        'REJECTED',
        this.rejectionReasonInput.trim(),
        this.role || 'Unknown Checker'
      );
    }
    this.cancelRejectionReason();
  }

  cancelRejectionReason(): void {
    this.showReasonModal = false;
    this.currentTransactionForReasonId = null;
    this.rejectionReasonInput = '';
    this.massActionType = null; // --- NEW: Clear mass action type on close ---
  }

  updateTransactionStatus(
    id: string,
    newStatus: 'ACCEPTED' | 'REJECTED' | 'DELETED',
    rejectionReason?: string,
    byUser?: string
  ): void {
    const index = this.transactionList.findIndex(txn => txn.id === id);
    if (index !== -1) {
      const originalTxn = { ...this.transactionList[index] }; // Save original for rollback

      const payload: {
        status: string;
        rejectionReason?: string;
        acceptedAt?: string;
        rejectedAt?: string;
        acceptedBy?: string;
        rejectedBy?: string;
        byUser?: string; // This is for backend logging/tracking
      } = { status: newStatus };

      // Update local transaction object with new status and related fields
      this.transactionList[index].status = newStatus;
      if (newStatus === 'ACCEPTED') {
        this.transactionList[index].acceptedAt = new Date().toISOString();
        this.transactionList[index].acceptedBy = byUser;
        // Clean up rejection fields if accepted
        delete this.transactionList[index].rejectedAt;
        delete this.transactionList[index].rejectionReason;
        delete this.transactionList[index].rejectedBy;
      } else if (newStatus === 'REJECTED') {
        this.transactionList[index].rejectedAt = new Date().toISOString();
        this.transactionList[index].rejectedBy = byUser;
        this.transactionList[index].rejectionReason = rejectionReason;
        // Clean up acceptance fields if rejected
        delete this.transactionList[index].acceptedAt;
        delete this.transactionList[index].acceptedBy;
      } else { // DELETED
        // Clean up all status-specific fields if deleted
        delete this.transactionList[index].acceptedAt;
        delete this.transactionList[index].acceptedBy;
        delete this.transactionList[index].rejectedAt;
        delete this.transactionList[index].rejectionReason;
        delete this.transactionList[index].rejectedBy;
      }

      this.sortTransactionsByCreatedAt(); // Re-sort after status change
      this.updateGridDataAndFilters(); // Refresh grid with updated data

      // Send patch request to backend
      this.http.patch<Transaction>(`${this.apiUrl}/${id}/status`, { ...payload, byUser: byUser })
        .pipe(
          tap((responseTxn) => {
            console.log(`Transaction ID: ${id} status updated to: ${newStatus} via backend.`, responseTxn);
            // Final sync with backend response
            const updatedIndex = this.transactionList.findIndex(t => t.id === responseTxn.id);
            if(updatedIndex !== -1) {
                this.transactionList[updatedIndex] = responseTxn;
            }
            if (this.selectedTransaction?.id === responseTxn.id) {
                this.selectedTransaction = responseTxn;
            }
            this.sortTransactionsByCreatedAt();
            // --- MODIFIED: Removed selectTab here. For mass actions, loadTransactions() handles the refresh and tab. ---
            // this.selectTab(newStatus); // Switch to the new status tab (removed for individual updates)
          }),
          catchError(err => {
            console.error('Error updating transaction status in backend:', err);
            // Rollback UI on error and re-fetch to ensure data consistency
            this.transactionList[index] = originalTxn;
            this.loadTransactions();
            return of(null);
          })
        )
        .subscribe();
    }
  }

  // --- NEW METHOD: To get selected transaction IDs for mass actions ---
  getSelectedTransactionIds(): string[] {
    if (this.gridApi) {
      return this.gridApi.getSelectedRows().map(txn => txn.id);
    }
    return [];
  }

  // --- NEW: Mass Action Logic ---
  confirmMassAction(actionType: 'delete' | 'accept' | 'reject'): void {
    const selectedTransactions = this.gridApi.getSelectedRows();
    if (selectedTransactions.length === 0) {
      console.warn('No transactions selected for mass action.');
      return;
    }

    this.closeAllModalsAndSidebars(); // Close other UI elements
    this.massActionType = actionType; // Store the intended mass action

    const transactionIds = selectedTransactions.map(txn => txn.id);
    // Display up to 3 IDs in the message, then "..." for brevity
    const idList = transactionIds.slice(0, 3).join(', ') + (transactionIds.length > 3 ? '...' : '');

    let confirmationMessage = '';
    switch (actionType) {
      case 'delete':
        confirmationMessage = `Are you sure you want to delete ${this.selectedRowCount} selected transactions (${idList})? This will move them to the 'Deleted' list.`;
        this.modalAction = () => this.executeMassAction('delete');
        break;
      case 'accept':
        confirmationMessage = `Are you sure you want to ACCEPT ${this.selectedRowCount} selected transactions (${idList})?`;
        this.modalAction = () => this.executeMassAction('accept');
        break;
      case 'reject':
        // For mass reject, we first prompt for a reason using the modified promptForRejectionReason
        this.promptForRejectionReason(selectedTransactions.map(t => t.id)); // Pass array of IDs
        return; // Exit here, as submitRejectionReason will call executeMassAction after getting the reason
    }

    this.modalMessage = confirmationMessage;
    this.showConfirmModal = true;
  }

  executeMassAction(actionType: 'delete' | 'accept' | 'reject'): void {
    if (!this.gridApi) return;

    const selectedTransactions: Transaction[] = this.gridApi.getSelectedRows();
    const selectedIds = selectedTransactions.map(txn => txn.id);

    if (selectedIds.length === 0) {
      console.warn('No transactions selected for mass action.');
      return;
    }

    console.log(`Executing mass ${actionType} for IDs:`, selectedIds);
    console.log('NOTE: In a real application, this would ideally be a SINGLE API call to a bulk endpoint, NOT individual calls.');

    // Simulate bulk action by iterating and calling single API for each
    // For a real backend, you would typically send one array of IDs to a new dedicated bulk endpoint
    // (e.g., this.http.patch<any>(`${this.apiUrl}/bulk-status`, { ids: selectedIds, status: newStatus, reason: rejectionReason }))
    const promises = selectedIds.map(id =>
      new Promise<void>((resolve, reject) => {
        // Ensure consistent `byUser` for all bulk actions
        const byUser = this.role || 'Unknown Checker';
        // Pass rejectionReason only if actionType is 'reject' and it's available
        this.updateTransactionStatus(id, actionType.toUpperCase() as any, actionType === 'reject' ? this.rejectionReasonInput.trim() : undefined, byUser);
        // Small delay to simulate async operations for better UI feedback during bulk processing
        setTimeout(() => resolve(), 50);
      })
    );

    Promise.all(promises).then(() => {
      console.log(`Mass ${actionType} completed for all selected transactions.`);
      this.gridApi.deselectAll(); // Clear selections after action
      this.selectedRowCount = 0;
      this.showMassActions = false;
      this.loadTransactions(); // Re-load all data to ensure UI consistency and reflect status changes
      this.closeConfirmModal(); // Close general confirmation modal
      // --- FIX: Call the correct method name 'cancelRejectionReason' ---
      if (actionType === 'reject') { // Close reason modal only if it was a reject action
         this.cancelRejectionReason();
      }
    }).catch(error => {
      console.error(`Error during mass ${actionType}:`, error);
      this.loadTransactions(); // Re-load data to restore state if errors occurred
    });
  }


  // Sidebar methods
  openSidebar(txn?: Transaction): void {
    // --- MODIFIED: Close any open forms/modals/mass action UI before opening sidebar ---
    this.closeAllModalsAndSidebars();

    this.showSidebar = true;
    if (txn) {
      this.selectedTransaction = { ...txn }; // Set selected transaction if opening from row click
      this.sidebarActiveTab = 'overview';
    } else {
      this.selectedTransaction = null; // Open to filters if no transaction selected (e.g., from filter icon)
      this.sidebarActiveTab = 'filter';
      this.currentFilterOptions = { ...this.filterOptions }; // Initialize current filter options for editing
    }
  }

  closeSidebar(): void {
    this.showSidebar = false;
    this.selectedTransaction = null;
    this.sidebarActiveTab = 'overview';
    // --- NEW: Deselect rows and reset selection count when sidebar is closed manually ---
    this.gridApi?.deselectAll();
    this.selectedRowCount = 0;
    this.showMassActions = false;
  }

  closeAllModalsAndSidebars(): void {
    this.showAddForm = false;
    this.showEditForm = false;
    this.showConfirmModal = false;
    this.showReasonModal = false;
    this.showSidebar = false;
    this.selectedTransaction = null;
    this.sidebarActiveTab = 'overview';
    // --- NEW: Deselect rows and reset selection count when any major UI element is closed ---
    this.gridApi?.deselectAll();
    this.selectedRowCount = 0;
    this.showMassActions = false;
  }

  selectSidebarTab(tab: 'overview' | 'history' | 'filter'): void {
    this.sidebarActiveTab = tab;
  }

  // Filter specific methods
  applyFilterOptions(): void {
    this.filterOptions = { ...this.currentFilterOptions }; // Apply current options to active filter
    this.updateGridDataAndFilters(); // Re-filter the grid
    this.closeSidebar();
  }

  clearFilterOptions(): void {
    const defaultFilterOptions = {
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
    this.filterOptions = { ...defaultFilterOptions }; // Reset active filters
    this.currentFilterOptions = { ...defaultFilterOptions }; // Reset sidebar inputs
    this.searchTerm = ''; // Clear search term
    this.updateGridDataAndFilters(); // Re-filter
  }

  onDateRangeChange(range: 'thisWeek' | 'lastMonth' | 'custom' | 'all'): void {
    this.currentFilterOptions.dateRange = range;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (range === 'thisWeek') {
        const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        this.currentFilterOptions.fromDate = this.datePipe.transform(firstDayOfWeek, 'yyyy-MM-dd') || '';
        this.currentFilterOptions.toDate = this.datePipe.transform(new Date(), 'yyyy-MM-dd') || '';
    } else if (range === 'lastMonth') {
        const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        this.currentFilterOptions.fromDate = this.datePipe.transform(firstDayOfLastMonth, 'yyyy-MM-dd') || ''; // Corrected format for input[type="date"]
        this.currentFilterOptions.toDate = this.datePipe.transform(lastDayOfLastMonth, 'yyyy-MM-dd') || ''; // Corrected format
    } else if (range === 'all') {
        this.currentFilterOptions.fromDate = '';
        this.currentFilterOptions.toDate = '';
    }
  }
}
