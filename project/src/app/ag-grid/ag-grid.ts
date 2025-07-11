import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  GridApi,
  GridOptions,
  RowClickedEvent,
  ModuleRegistry,
  AllCommunityModule,
  ICellRendererParams
} from 'ag-grid-community';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { StatusCellRendererComponent } from '../status-cell-renderer/status-cell-renderer.component';
import { ActionsCellRendererComponent } from '../actions-cell-renderer/actions-cell-renderer.component';

import { Transaction } from '../interfaces/transaction.interface';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-transaction-table',
  standalone: true,
  imports: [
    CommonModule,
    AgGridAngular,
    StatusCellRendererComponent,
    ActionsCellRendererComponent
  ],
  providers: [DatePipe],
  templateUrl: './ag-grid.html',
  // Note: The ag-grid.scss is now typically applied globally or via a shared style sheet,
  // but if you prefer component-level, ensure it's uncommented and path is correct.
  // styleUrls: ['./ag-grid.scss']
})
export class TransactionTableComponent implements OnInit, OnChanges {
  @Input() rowData: Transaction[] = [];
  @Input() role: string | null = null;
  @Input() activeTab!: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'DELETED';
  @Input() selectedRowCount: number = 0;
  @Input() showMassActions: boolean = false;

  @Output() gridApiReady = new EventEmitter<GridApi>();
  @Output() rowSelected = new EventEmitter<{ selectedCount: number; selectedRows: Transaction[] }>();
  @Output() rowClicked = new EventEmitter<Transaction>();
  @Output() editClicked = new EventEmitter<Transaction>();
  @Output() deleteClicked = new EventEmitter<string>();
  @Output() acceptClicked = new EventEmitter<string>();
  @Output() rejectClicked = new EventEmitter<string>();
  @Output() massDeleteClicked = new EventEmitter<void>();
  @Output() massAcceptClicked = new EventEmitter<void>();
  @Output() massRejectClicked = new EventEmitter<void>();

  gridApi!: GridApi;

  gridOptions: GridOptions = {
    domLayout: 'autoHeight',
    pagination: true,
    paginationPageSize: 4,
    suppressCellFocus: true,
    paginationPageSizeSelector: false,
    suppressPaginationPanel: true,
    theme: 'legacy',
    
    components: {
      statusCellRenderer: StatusCellRendererComponent,
      actionsCellRenderer: ActionsCellRendererComponent,
    },
    context: {
      parentComponent: this
    },
    rowSelection:'multiple',
    
    enableCellTextSelection: true,
    ensureDomOrder: true,

    onSelectionChanged: (params) => {
      if (this.gridApi) {
        const selectedRows = this.gridApi.getSelectedRows();
        this.rowSelected.emit({ selectedCount: selectedRows.length, selectedRows });
      }
    },

    onRowClicked: (event: RowClickedEvent) => {
      if (
        event.data &&
        event.event?.target &&
        !(event.event.target as HTMLElement).closest('.action-buttons') && 
        !(event.event.target as HTMLElement).closest('.ag-selection-checkbox')
      ) {
        this.rowClicked.emit(event.data);
      }
    },

    onGridReady: (params) => {
      this.gridApi = params.api;
      this.gridApiReady.emit(this.gridApi);
      if (this.gridOptions.context) {
        this.gridOptions.context.role = this.role;
      }
      this.updateColumnVisibility(); // Call this on grid ready
      params.api.sizeColumnsToFit();
    },

    onFirstDataRendered: (params) => {
      params.api.sizeColumnsToFit();
    },

    onGridSizeChanged: (params) => {
      if (this.gridApi) {
        this.gridApi.sizeColumnsToFit();
      }
    },

    defaultColDef: {
      sortable: true,
      filter: false,
      resizable: true,
      flex: 1,
      minWidth: 100,
    }
  };

  ngOnInit(): void {
    if (this.gridOptions.context) {
      this.gridOptions.context.role = this.role;
    }
    // Update column visibility on init as well
    this.updateColumnVisibility();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rowData'] && this.gridApi) {
      this.gridApi.setGridOption('rowData', this.rowData);
      this.gridApi.paginationGoToFirstPage();
    }
    if (changes['role'] && this.gridOptions.context) {
      this.gridOptions.context.role = this.role;
      if (this.gridApi) {
        this.gridApi.refreshCells({ force: true });
      }
    }
    // Check for activeTab changes to update column visibility
    if (changes['activeTab'] && this.gridApi) {
      this.updateColumnVisibility();
    }
  }

  private updateColumnVisibility(): void {
    if (!this.gridApi) return;

    const newColumnDefs: ColDef[] = [
      {
        headerName: '',
        checkboxSelection: true,
        width: 40,
        minWidth: 70,
        maxWidth: 70,
        resizable: false,
        sortable: false,
        filter: false,
        suppressColumnsToolPanel: true,
        suppressNavigable: true,
        lockPosition: true,
      },
      {
        headerName: 'ID',
        field: 'id',
        minWidth: 120,
        cellRenderer: (params: any) => {
          const mainId = params.value;
          const referenceNum = `Ref: ${mainId ? mainId.substring(0, 8) + '...' : '-'}`;
          return `
            <div style="display: flex; flex-direction: column; justify-content: center; height: 100%; padding-left: 10px;">
              <div style="font-weight: 500; color: #333; line-height: 1.2;">${mainId || '-'}</div>
              <div style="font-size: 0.8em; color: gray; line-height: 1.2; margin-top: 2px;">${referenceNum}</div>
            </div>
          `;
        },
        autoHeight: true,
        cellStyle: { cursor: 'pointer', 'white-space': 'normal' }
      },
      { headerName: 'From (Account)', field: 'fromAccount', cellStyle: { cursor: 'pointer' } },
      { headerName: 'To (Account)', field: 'toAccount', cellStyle: { cursor: 'pointer' } },
      {
        headerName: 'Amount',
        field: 'amount',
        type: 'numericColumn',
        cellRenderer: (params: any) => {
          const formattedAmount = params.value != null ? params.value.toFixed(2) : '-';
          const currency = params.data.currency || '-';
          return `
            <div style="display: flex; flex-direction: column; justify-content: center; height: 100%; padding-right: 10px; text-align: right;">
              <div style="font-weight: 500; color: #333; line-height: 1.2;">${formattedAmount}</div>
              <div style="font-size: 0.8em; color: gray; line-height: 1.2; margin-top: 2px;">${currency}</div>
            </div>
          `;
        },
        autoHeight: true,
        cellStyle: { cursor: 'pointer', 'white-space': 'normal', 'text-align': 'right' }
      },
      { headerName: 'Description', field: 'description', cellStyle: { cursor: 'pointer' } },
      {
        headerName: 'Status',
        field: 'status',
        cellRenderer: 'statusCellRenderer',
        cellStyle: { cursor: 'pointer' },
        minWidth: 120
      },
    ];

    // Conditionally add 'Reason' column
    if (this.activeTab !== 'ACCEPTED' && this.activeTab !== 'DELETED') {
      newColumnDefs.push({
        headerName: 'Reason',
        field: 'rejectionReason',
        cellStyle: { cursor: 'pointer' },
        valueGetter: (params: any) => params.data.rejectionReason || '-'
      });
    }

    // Conditionally add 'Actions' column
    if (this.activeTab !== 'REJECTED' && this.activeTab !== 'ACCEPTED' && this.activeTab !== 'DELETED') {
      newColumnDefs.push({
        headerName: 'Actions',
        cellRenderer: 'actionsCellRenderer',
        width: 80,
        minWidth: 80,
        maxWidth: 80,
        sortable: false,
        filter: false,
        resizable: false,
        cellClass: 'ag-grid-action-cell',
        suppressColumnsToolPanel: true,
        suppressMovable: true,
        lockPosition: 'right',
        flex: 0
      });
    }

    this.gridApi.setGridOption('columnDefs', newColumnDefs);
    this.gridApi.sizeColumnsToFit();
  }

  // Define columnDefs as a property for initial setup, it will be updated dynamically
  public columnDefs: ColDef[] = []; 

  get totalPages(): number {
    return this.gridApi ? this.gridApi.paginationGetTotalPages() : 1;
  }

  get currentPageNumber(): number {
    return this.gridApi ? this.gridApi.paginationGetCurrentPage() + 1 : 1;
  }

  getPaginationPageNumbers(): number[] {
    if (!this.gridApi) return [];

    const totalPages = this.totalPages;
    const currentPage = this.currentPageNumber;
    const maxPagesToShow = 5;
    const pages: number[] = [];

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
      let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

      if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }

      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) pages.push(-1);
      }

      for (let i = startPage; i <= endPage; i++) pages.push(i);

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) pages.push(-1);
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

  onEdit(transaction: Transaction): void {
    this.editClicked.emit(transaction);
  }

  onDelete(transactionId: string): void {
    this.deleteClicked.emit(transactionId);
  }

  onAccept(transactionId: string): void {
    this.acceptClicked.emit(transactionId);
  }

  onReject(transactionId: string): void {
    this.rejectClicked.emit(transactionId);
  }

  onMassDelete(): void {
    this.massDeleteClicked.emit();
  }

  onMassAccept(): void {
    this.massAcceptClicked.emit();
  }

  onMassReject(): void {
    this.massRejectClicked.emit();
  }
}